import os
import sys
import time
import ftplib

log_lines = []
def log(msg):
    print(msg)
    log_lines.append(str(msg))

def connect_ftp(server, username, password, timeout=60):
    for attempt in range(1, 6):
        try:
            log(f'Connecting to Hostinger FTP (attempt {attempt}/5): {server}...')
            ftp = ftplib.FTP(server, timeout=timeout)
            ftp.login(username, password)
            ftp.set_pasv(True)
            log('Logged in successfully.')
            return ftp
        except Exception as e:
            log(f'FTP connection attempt {attempt} failed: {e}')
            if attempt < 5:
                time.sleep(3)
    raise RuntimeError('Could not establish connection to FTP server after 5 attempts.')

def main():
    server = os.environ.get('FTP_SERVER', '').replace('ftp://', '').replace('ftps://', '').rstrip('/')
    username = os.environ.get('FTP_USERNAME', '')
    password = os.environ.get('FTP_PASSWORD', '')
    raw_dir = os.environ.get('FTP_SERVER_DIR', '').strip('/')
    local_dir = os.environ.get('LOCAL_DIR', './deploy_payload')

    if not server or not username or not password:
        log('Error: Missing required FTP environment variables')
        sys.exit(1)

    ftp = connect_ftp(server, username, password, timeout=60)
    initial_pwd = ftp.pwd()
    log(f'Initial FTP working directory: {initial_pwd}')
    log(f'FTP_SERVER_DIR environment variable: "{raw_dir}"')

    # Explore filesystem from initial_pwd
    log('--- Exploring Remote FTP Tree ---')
    try:
        root_listing = ftp.nlst()
        log(f'Landing directory entries: {root_listing}')
    except Exception as e:
        log(f'Could not list landing directory: {e}')

    try:
        ftp.cwd('/')
        sys_root_listing = ftp.nlst()
        log(f'System / entries: {sys_root_listing}')
    except Exception as e:
        log(f'Could not list system /: {e}')

    try:
        ftp.cwd('/domains')
        domains_listing = ftp.nlst()
        log(f'/domains entries: {domains_listing}')
    except Exception as e:
        log(f'Could not list /domains: {e}')

    # Candidate LMS document roots on Hostinger
    candidate_paths = [
        'domains/lms.aaroha-inc.com/public_html',
        'domains/aaroha-inc.com/public_html/lms',
        'domains/aaroha-inc.com/public_html',
        'public_html/lms',
        'public_html',
    ]
    if raw_dir and raw_dir not in candidate_paths:
        candidate_paths.insert(0, raw_dir)

    discovered_roots = []
    for cand in candidate_paths:
        cand_clean = cand.strip('/')
        # Test relative from initial_pwd
        try:
            ftp.cwd(initial_pwd)
        except Exception:
            pass
        try:
            ftp.cwd(cand_clean)
            discovered_roots.append(cand_clean)
            log(f'  [FOUND LMS ROOT - RELATIVE] {cand_clean}')
            continue
        except Exception:
            pass

        # Test absolute with leading slash
        try:
            target_cand = '/' + cand_clean
            ftp.cwd(target_cand)
            discovered_roots.append(target_cand)
            log(f'  [FOUND LMS ROOT - ABSOLUTE] {target_cand}')
            continue
        except Exception:
            pass

    # If none found by candidate paths, fall back to initial_pwd
    if not discovered_roots:
        discovered_roots.append(initial_pwd)

    discovered_roots = list(dict.fromkeys(discovered_roots))
    log(f'Target deployment destinations: {discovered_roots}')

    # Active FTP connection holder
    ftp_holder = {'conn': ftp}

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
            new_f = connect_ftp(server, username, password, timeout=60)
            ftp_holder['conn'] = new_f
            return new_f

    def ensure_remote_directory(target_path):
        f = get_active_ftp()
        # Reset to initial_pwd
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

    def upload_file(remote_dir, item, local_full, remote_file_map, child_rel):
        file_size = os.path.getsize(local_full)
        force_upload = item in ('index.html', '.htaccess', 'version.json', 'index.php', 'deploy.log') or item.endswith('.php') or item.endswith('.sql')

        if not force_upload and item in remote_file_map and remote_file_map[item] == file_size:
            log(f'  [CACHE HIT] {child_rel} (unchanged, {file_size} bytes)')
            return

        log(f'  -> Uploading {child_rel} ({file_size} bytes)...')
        for retry in range(1, 5):
            try:
                ensure_remote_directory(remote_dir)
                f = get_active_ftp()
                with open(local_full, 'rb') as fp:
                    f.storbinary(f'STOR {item}', fp)
                time.sleep(0.04)
                return
            except Exception as e:
                log(f'     [RETRY {retry}/4] Error storing {child_rel}: {e}')
                time.sleep(2 * retry)
                try:
                    ftp_holder['conn'].close()
                except Exception:
                    pass
                ftp_holder['conn'] = connect_ftp(server, username, password, timeout=60)
        log(f'     [FAILED] Unable to upload {child_rel} after 4 attempts')

    def sync_tree(local_base, target_root, remote_rel=''):
        remote_dir = target_root.rstrip('/') + ('/' + remote_rel if remote_rel else '')
        ensure_remote_directory(remote_dir)

        f = get_active_ftp()
        remote_file_map = {}
        try:
            for name, facts in f.mlsd():
                if facts.get('type') == 'file':
                    remote_file_map[name] = int(facts.get('size', -1))
        except Exception:
            pass

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
                if item.endswith('.sqlite') or item.endswith('.db'):
                    if item in remote_file_map and remote_file_map[item] > 0:
                        log(f'  [DATABASE PRESERVED] {child_rel}')
                        continue

                upload_file(remote_dir, item, local_full, remote_file_map, child_rel)

    for target in discovered_roots:
        log(f'\n--- Synchronizing deployment payload to: {target} ---')
        sync_tree(local_dir, target)

    # Save and upload deploy.log to all targets so it can be viewed over HTTP
    with open('deploy.log', 'w', encoding='utf-8') as f:
        f.write('\n'.join(log_lines))

    for target in discovered_roots:
        try:
            upload_file(target, 'deploy.log', 'deploy.log', {}, 'deploy.log')
        except Exception:
            pass

    log('\nDeployment payload synchronized successfully to all target destinations!')
    try:
        ftp_holder['conn'].quit()
    except Exception:
        pass

if __name__ == '__main__':
    main()
