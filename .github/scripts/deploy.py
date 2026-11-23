import os
import sys
import time
import ftplib

log_lines = []
def log(msg):
    print(msg)
    log_lines.append(str(msg))

def connect_ftp(server, username, password, timeout=15):
    for attempt in range(1, 5):
        try:
            log(f'Connecting to Hostinger FTP (attempt {attempt}/4): {server}...')
            ftp = ftplib.FTP(server, timeout=timeout)
            ftp.login(username, password)
            ftp.set_pasv(True)
            log('Logged in successfully.')
            return ftp
        except Exception as e:
            log(f'FTP connection attempt {attempt} failed: {e}')
            if attempt < 4:
                time.sleep(2)
    raise RuntimeError('Could not establish connection to FTP server after 4 attempts.')

def main():
    server = os.environ.get('FTP_SERVER', '').replace('ftp://', '').replace('ftps://', '').rstrip('/')
    username = os.environ.get('FTP_USERNAME', '')
    password = os.environ.get('FTP_PASSWORD', '')
    raw_dir = os.environ.get('FTP_SERVER_DIR', '').strip('/')
    local_dir = os.environ.get('LOCAL_DIR', './deploy_payload')

    if not server or not username or not password:
        log('Error: Missing required FTP environment variables')
        sys.exit(1)

    ftp = connect_ftp(server, username, password, timeout=15)
    initial_pwd = ftp.pwd()
    log(f'Initial FTP working directory: {initial_pwd}')
    log(f'FTP_SERVER_DIR environment variable: "{raw_dir}"')

    ftp_holder = {'conn': ftp}
    active_dir_holder = {'dir': None}

    def get_active_ftp():
        f = ftp_holder['conn']
        try:
            f.voidcmd('NOOP')
            return f
        except Exception:
            log('FTP connection dropped. Reconnecting...')
            try:
                f.close()
            except Exception:
                pass
            active_dir_holder['dir'] = None
            new_f = connect_ftp(server, username, password, timeout=15)
            ftp_holder['conn'] = new_f
            return new_f

    def ensure_remote_directory(target_path):
        if active_dir_holder['dir'] == target_path:
            return
        f = get_active_ftp()
        try:
            f.cwd(initial_pwd)
        except Exception:
            try:
                f.cwd('/')
            except Exception:
                pass
        clean = target_path
        if initial_pwd and initial_pwd != '/' and clean.startswith(initial_pwd):
            clean = clean[len(initial_pwd):]
        parts = [p for p in clean.strip('/').split('/') if p]
        for p in parts:
            try:
                f.cwd(p)
            except Exception:
                try:
                    f.mkd(p)
                except Exception:
                    pass
                try:
                    f.cwd(p)
                except Exception as e:
                    log(f'Warning: unable to enter remote dir {p}: {e}')
                    raise
        active_dir_holder['dir'] = target_path

    # LMS Document roots on Hostinger
    # 1. Standard Hostinger normal/shared hosting root (public_html/lms and public_html)
    # 2. Addon domain document roots (domains/aaroha-inc.com/public_html/lms, etc.)
    candidate_paths = []
    if raw_dir:
        cand_raw = raw_dir.strip('/')
        candidate_paths.append(cand_raw)
        if not cand_raw.startswith('domains/'):
            candidate_paths.append(f'domains/aaroha-inc.com/{cand_raw}')
            candidate_paths.append(f'domains/lms.aaroha-inc.com/{cand_raw}')

    candidate_paths.extend([
        'public_html/lms',
        'public_html',
        'domains/aaroha-inc.com/public_html/lms',
        'domains/lms.aaroha-inc.com/public_html',
        'domains/aaroha-inc.com/public_html',
    ])

    discovered_roots = []
    for cand in candidate_paths:
        cand_clean = cand.strip('/')
        try:
            ensure_remote_directory(cand_clean)
            discovered_roots.append(cand_clean)
            log(f'  [FOUND/CREATED LMS ROOT] {cand_clean}')
        except Exception as e:
            log(f'  [SKIPPED ROOT] {cand_clean}: {e}')

    if not discovered_roots:
        discovered_roots.append(initial_pwd)

    discovered_roots = list(dict.fromkeys(discovered_roots))
    log(f'Target deployment destinations: {discovered_roots}')

    def upload_file(remote_dir, item, local_full, child_rel):
        file_size = os.path.getsize(local_full)
        log(f'  -> Uploading {child_rel} ({file_size} bytes)...')
        for retry in range(1, 4):
            try:
                ensure_remote_directory(remote_dir)
                f = get_active_ftp()
                with open(local_full, 'rb') as fp:
                    f.storbinary(f'STOR {item}', fp)
                return
            except Exception as e:
                log(f'     [RETRY {retry}/3] Error storing {child_rel}: {e}')
                active_dir_holder['dir'] = None
                time.sleep(1)
                try:
                    ftp_holder['conn'].close()
                except Exception:
                    pass
                ftp_holder['conn'] = connect_ftp(server, username, password, timeout=15)
        log(f'     [FAILED] Unable to upload {child_rel} after 3 attempts')

    def sync_tree(local_base, target_root, remote_rel=''):
        remote_dir = target_root.rstrip('/') + ('/' + remote_rel if remote_rel else '')
        ensure_remote_directory(remote_dir)

        # Sort so that critical routing, entrypoints and PHP configs are uploaded first
        items = sorted(os.listdir(local_base), key=lambda x: (
            0 if x in ('index.php', 'index.html', '.htaccess', 'version.json', 'deploy.log') else
            1 if x.endswith('.php') else
            2 if os.path.isdir(os.path.join(local_base, x)) else
            3
        ))

        for item in items:
            local_full = os.path.join(local_base, item)
            child_rel = f'{remote_rel}/{item}'.strip('/') if remote_rel else item

            if os.path.isdir(local_full):
                sync_tree(local_full, target_root, child_rel)
            else:
                if item == 'env.php':
                    continue

                upload_file(remote_dir, item, local_full, child_rel)

    for target in discovered_roots:
        log(f'\n--- Synchronizing deployment payload to: {target} ---')
        # Clean up any residual root-level index.php from earlier deployments so DirectoryIndex serves index.html
        f = get_active_ftp()
        try:
            ensure_remote_directory(target)
            f.delete('index.php')
            log(f'  [CLEANUP] Deleted residual root index.php in {target}')
        except Exception:
            pass
        sync_tree(local_dir, target)
        marker_name = 'docroot_target.txt'
        marker_path = os.path.join(local_dir, marker_name)
        with open(marker_path, 'w', encoding='utf-8') as mf:
            mf.write(f'Target: {target}\n')
        upload_file(target, marker_name, marker_path, marker_name)

    # Save and upload deploy.log to all targets
    with open('deploy.log', 'w', encoding='utf-8') as f:
        f.write('\n'.join(log_lines))

    for target in discovered_roots:
        try:
            upload_file(target, 'deploy.log', 'deploy.log', 'deploy.log')
        except Exception:
            pass

    log('\nDeployment payload synchronized successfully to all target destinations!')
    try:
        ftp_holder['conn'].quit()
    except Exception:
        pass

if __name__ == '__main__':
    main()
