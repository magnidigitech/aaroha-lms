import os
import sys
import time
import ftplib

def connect_ftp(server, username, password, timeout=60):
    for attempt in range(1, 6):
        try:
            print(f'Connecting to Hostinger FTP (attempt {attempt}/5): {server}...')
            ftp = ftplib.FTP(server, timeout=timeout)
            ftp.login(username, password)
            ftp.set_pasv(True)
            print('Logged in successfully.')
            return ftp
        except Exception as e:
            print(f'FTP connection attempt {attempt} failed: {e}')
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
        print('Error: Missing required FTP environment variables (FTP_SERVER, FTP_USERNAME, FTP_PASSWORD)')
        sys.exit(1)

    ftp = connect_ftp(server, username, password, timeout=60)

    initial_pwd = ftp.pwd()
    print(f'Initial FTP working directory: {initial_pwd}')

    # Candidate LMS document roots on Hostinger
    candidate_paths = [
        'domains/aaroha-inc.com/public_html/lms',
        'domains/lms.aaroha-inc.com/public_html',
        'public_html/lms',
    ]
    if raw_dir and raw_dir not in candidate_paths:
        candidate_paths.append(raw_dir)

    discovered_roots = []
    for cand in candidate_paths:
        try:
            ftp.cwd(initial_pwd)
        except Exception:
            pass
        try:
            target_cand = '/' + cand.strip('/')
            ftp.cwd(target_cand)
            discovered_roots.append(target_cand)
            print(f'  [FOUND LMS ROOT] {target_cand}')
        except Exception:
            try:
                ftp.cwd(cand.strip('/'))
                discovered_roots.append(cand.strip('/'))
                print(f'  [FOUND LMS ROOT] {cand.strip("/")}')
            except Exception:
                pass

    # If none found by candidate paths, check FTP landing directory
    if not discovered_roots:
        try:
            ftp.cwd(initial_pwd)
            nlst = ftp.nlst()
            basenames = [x.rstrip('/').split('/')[-1] for x in nlst]
            if 'index.html' in basenames or 'assets' in basenames or 'api' in basenames:
                discovered_roots.append(initial_pwd)
            elif 'public_html' in basenames:
                discovered_roots.append(initial_pwd.rstrip('/') + '/public_html')
        except Exception:
            discovered_roots.append(initial_pwd)

    # Deduplicate discovered roots
    discovered_roots = list(dict.fromkeys(discovered_roots))
    print(f'Target deployment destinations: {discovered_roots}')

    # Active FTP connection holder
    ftp_holder = {'conn': ftp}

    def get_active_ftp():
        f = ftp_holder['conn']
        try:
            f.voidcmd('NOOP')
            return f
        except Exception:
            print('FTP connection dropped. Reconnecting...')
            try:
                f.close()
            except Exception:
                pass
            new_f = connect_ftp(server, username, password, timeout=60)
            ftp_holder['conn'] = new_f
            return new_f

    def ensure_remote_directory(target_path):
        f = get_active_ftp()
        try:
            f.cwd(initial_pwd)
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
                    print(f'Warning: unable to enter remote dir {p}: {e}')

    def upload_file(remote_dir, item, local_full, remote_file_map, child_rel):
        file_size = os.path.getsize(local_full)
        # Always force upload entrypoints, scripts, routing configs and version
        force_upload = item in ('index.html', '.htaccess', 'version.json', 'index.php') or item.endswith('.php') or item.endswith('.sql')

        if not force_upload and item in remote_file_map and remote_file_map[item] == file_size:
            print(f'  [CACHE HIT] {child_rel} (unchanged, {file_size} bytes)')
            return

        print(f'  -> Uploading {child_rel} ({file_size} bytes)...')
        for retry in range(1, 5):
            try:
                ensure_remote_directory(remote_dir)
                f = get_active_ftp()
                with open(local_full, 'rb') as fp:
                    f.storbinary(f'STOR {item}', fp)
                # Small pause to avoid tripping Hostinger firewall connection throttling
                time.sleep(0.05)
                return
            except Exception as e:
                print(f'     [RETRY {retry}/4] Error storing {child_rel}: {e}')
                time.sleep(2 * retry)
                try:
                    ftp_holder['conn'].close()
                except Exception:
                    pass
                ftp_holder['conn'] = connect_ftp(server, username, password, timeout=60)
        print(f'     [FAILED] Unable to upload {child_rel} after 4 attempts')

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

        # Sort so that critical routing, entrypoints and PHP configs are uploaded first
        items = sorted(os.listdir(local_base), key=lambda x: (
            0 if x in ('index.php', 'index.html', '.htaccess', 'version.json') else
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
                # Never overwrite existing production SQLite databases with empty templates
                if item.endswith('.sqlite') or item.endswith('.db'):
                    if item in remote_file_map and remote_file_map[item] > 0:
                        print(f'  [DATABASE PRESERVED] {child_rel} (live database preserved, skipping upload)')
                        continue

                upload_file(remote_dir, item, local_full, remote_file_map, child_rel)

    for target in discovered_roots:
        print(f'\n--- Synchronizing deployment payload to: {target} ---')
        sync_tree(local_dir, target)

    print('\nDeployment payload synchronized successfully to all target destinations!')
    try:
        ftp_holder['conn'].quit()
    except Exception:
        pass

if __name__ == '__main__':
    main()
