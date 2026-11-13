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

    nlst = []
    try:
        nlst = ftp.nlst()
    except Exception as e:
        print(f'Notice: nlst() error: {e}')
    print(f'FTP root listing: {nlst}')

    # Auto-resolve correct document root
    # Priority 1: User is already chrooted into web root (index.html or assets present)
    target_dir = ''
    if 'index.html' in nlst or 'assets' in nlst:
        target_dir = ''
        print('-> Target resolved to FTP root (chrooted web root): /')
    elif 'lms' in nlst:
        target_dir = 'lms'
        print('-> Target resolved to subfolder: /lms')
    elif 'public_html' in nlst:
        try:
            p_nlst = ftp.nlst('public_html')
            target_dir = 'public_html/lms' if any('lms' in x for x in p_nlst) else 'public_html'
        except Exception:
            target_dir = 'public_html/lms'
        print(f'-> Target resolved inside public_html: /{target_dir}')
    elif 'domains' in nlst:
        target_dir = 'domains/aaroha-inc.com/public_html/lms'
        print(f'-> Target resolved to domains path: /{target_dir}')
    elif raw_dir:
        target_dir = raw_dir
        print(f'-> Target resolved from FTP_SERVER_DIR: /{target_dir}')
    else:
        target_dir = ''
        print('-> Defaulting target to FTP root: /')

    # Navigate to target directory if specified
    if target_dir:
        parts = target_dir.strip('/').split('/')
        for part in parts:
            if not part:
                continue
            try:
                ftp.cwd(part)
            except ftplib.error_perm:
                print(f'Creating remote directory: {part}')
                ftp.mkd(part)
                ftp.cwd(part)

    base_pwd = ftp.pwd()
    print(f'Deployment destination directory: {base_pwd}')

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
                # Return to current directory after recursion
                ftp.cwd(current_dir)
            else:
                if item == 'env.php':
                    continue
                file_size = os.path.getsize(local_full)
                force_upload = item in ('index.html', '.htaccess')

                if not force_upload and item in remote_file_map and remote_file_map[item] == file_size:
                    print(f'  [CACHE HIT] {child_rel} (unchanged, {file_size} bytes)')
                    continue

                print(f'  -> Uploading {child_rel} ({file_size} bytes)...')
                with open(local_full, 'rb') as f:
                    ftp.storbinary(f'STOR {item}', f)

    print(f'Synchronizing payload from {local_dir} into {base_pwd} with Delta Caching...')
    upload_dir(local_dir)
    print('Deployment completed successfully!')
    ftp.quit()

if __name__ == '__main__':
    main()

