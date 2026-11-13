import os
import sys
import ftplib

def main():
    server = os.environ.get('FTP_SERVER', '').replace('ftp://', '').replace('ftps://', '').rstrip('/')
    username = os.environ.get('FTP_USERNAME', '')
    password = os.environ.get('FTP_PASSWORD', '')
    raw_dir = os.environ.get('FTP_SERVER_DIR', '').strip('/')
    local_dir = os.environ.get('LOCAL_DIR', './deploy_payload')

    if not server or not username or not password:
        print('Error: Missing required FTP environment variables (FTP_SERVER, FTP_USERNAME, FTP_PASSWORD)')
        sys.exit(1)

    print(f'Connecting to Hostinger FTP: {server} as {username}...')
    ftp = ftplib.FTP(server, timeout=30)
    ftp.login(username, password)
    ftp.set_pasv(True)
    print('Logged in successfully.')

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

    # Auto-discover existing document roots
    discovered_roots = []
    for cand in candidate_paths:
        try:
            ftp.cwd('/' + cand.strip('/'))
            discovered_roots.append('/' + cand.strip('/'))
            print(f'  [FOUND LMS ROOT] /{cand}')
        except Exception:
            pass

    # If none found by direct path, check FTP landing directory
    if not discovered_roots:
        try:
            nlst = ftp.nlst('/')
            basenames = [x.rstrip('/').split('/')[-1] for x in nlst]
            if 'index.html' in basenames or 'assets' in basenames:
                discovered_roots.append('/')
            elif 'public_html' in basenames:
                discovered_roots.append('/public_html')
        except Exception:
            discovered_roots.append('/')

    print(f'Target deployment destinations: {discovered_roots}')

    def upload_dir(local_base, remote_rel=''):
        current_dir = ftp.pwd()

        remote_file_map = {}
        try:
            for name, facts in ftp.mlsd():
                if facts.get('type') == 'file':
                    remote_file_map[name] = int(facts.get('size', -1))
        except Exception:
            pass

        for item in sorted(os.listdir(local_base)):
            local_full = os.path.join(local_base, item)
            child_rel = f"{remote_rel}/{item}".strip('/') if remote_rel else item

            if os.path.isdir(local_full):
                try:
                    ftp.mkd(item)
                except ftplib.error_perm:
                    pass
                ftp.cwd(item)
                upload_dir(local_full, child_rel)
                ftp.cwd(current_dir)
            else:
                if item == 'env.php':
                    continue
                file_size = os.path.getsize(local_full)
                force_upload = item in ('index.html', '.htaccess', 'version.json')

                if not force_upload and item in remote_file_map and remote_file_map[item] == file_size:
                    print(f'  [CACHE HIT] {child_rel} (unchanged, {file_size} bytes)')
                    continue

                print(f'  -> Uploading {child_rel} ({file_size} bytes)...')
                with open(local_full, 'rb') as f:
                    ftp.storbinary(f'STOR {item}', f)

    # Deploy payload to all valid LMS document roots
    for target in discovered_roots:
        print(f'\n--- Synchronizing to target: {target} ---')
        ftp.cwd(target)
        upload_dir(local_dir)

    print('\nDeployment completed successfully to all target roots!')
    ftp.quit()

if __name__ == '__main__':
    main()
