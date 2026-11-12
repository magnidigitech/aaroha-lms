import os
import sys
import ftplib

def main():
    server = os.environ.get('FTP_SERVER', '').replace('ftp://', '').replace('ftps://', '').rstrip('/')
    username = os.environ.get('FTP_USERNAME', '')
    password = os.environ.get('FTP_PASSWORD', '')
    raw_dir = os.environ.get('FTP_SERVER_DIR', 'domains/aaroha-inc.com/public_html/lms/').strip('/')
    local_dir = os.environ.get('LOCAL_DIR', './deploy_payload')

    if not server or not username or not password:
        print('Error: Missing required FTP environment variables (FTP_SERVER, FTP_USERNAME, FTP_PASSWORD)')
        sys.exit(1)

    if raw_dir.startswith('public_html'):
        raw_dir = 'domains/aaroha-inc.com/' + raw_dir

    print(f'Connecting to Hostinger FTP: {server} as {username}...')
    ftp = ftplib.FTP(server, timeout=30)
    ftp.login(username, password)
    ftp.set_pasv(True)
    print('Logged in successfully.')

    # Ensure remote base directories exist and navigate into it
    parts = raw_dir.split('/')
    current = ''
    for part in parts:
        if not part:
            continue
        current += '/' + part
        try:
            ftp.cwd(current)
        except ftplib.error_perm:
            print(f'Creating remote directory: {current}')
            ftp.mkd(current)
            ftp.cwd(current)

    base_remote = '/' + raw_dir

    def get_remote_files(remote_dir):
        files = {}
        try:
            ftp.cwd(remote_dir)
            for name, facts in ftp.mlsd():
                if facts.get('type') == 'file':
                    files[name] = int(facts.get('size', -1))
        except Exception:
            pass
        return files

    def upload_dir(local_base, remote_base):
        remote_file_map = get_remote_files(remote_base)

        for item in sorted(os.listdir(local_base)):
            local_full = os.path.join(local_base, item)
            remote_full = f'{remote_base}/{item}'

            if os.path.isdir(local_full):
                try:
                    ftp.mkd(remote_full)
                except ftplib.error_perm:
                    pass
                upload_dir(local_full, remote_full)
            else:
                # Skip sensitive local config if any
                if item == 'env.php':
                    continue
                file_size = os.path.getsize(local_full)

                # Delta Check: Skip if remote file exists and has identical size
                if item in remote_file_map and remote_file_map[item] == file_size:
                    if item != 'index.html':
                        print(f'  [CACHE HIT] {item} (unchanged, {file_size} bytes)')
                        continue

                print(f'  -> Uploading {item} ({file_size} bytes)...')
                with open(local_full, 'rb') as f:
                    ftp.storbinary(f'STOR {remote_full}', f)

    print(f'Synchronizing payload from {local_dir} to {base_remote} with Delta Caching...')
    upload_dir(local_dir, base_remote)
    print('Deployment completed successfully!')
    ftp.quit()

if __name__ == '__main__':
    main()

