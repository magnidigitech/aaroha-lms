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

    # Inspect the items in the current landing directory
    root_items = []
    try:
        root_items = [name for name, facts in ftp.mlsd()]
    except Exception:
        pass
    print(f'FTP root directory contents: {root_items}')

    # Automatic root detection:
    # If the FTP account was created for the subdomain, index.html or assets is already in current directory,
    # or the user configured '.' or empty string for FTP_SERVER_DIR.
    # In that case, we MUST upload directly to the landing directory without prepending paths.
    if 'index.html' in root_items or 'assets' in root_items or raw_dir in ('', '.', '/', './'):
        base_remote = '/'
        print('Target directory resolved to FTP user root: /')
    else:
        # Standard unchrooted account, navigate to designated server dir
        if not raw_dir:
            raw_dir = 'domains/aaroha-inc.com/public_html/lms'
        elif raw_dir.startswith('public_html'):
            raw_dir = 'domains/aaroha-inc.com/' + raw_dir

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
        base_remote = '/' + raw_dir.strip('/')
        print(f'Target directory resolved to: {base_remote}')

    def upload_dir(local_base, remote_dir):
        # Always navigate to absolute remote_dir
        target_dir = '/' + remote_dir.strip('/') if remote_dir != '/' else '/'
        try:
            ftp.cwd(target_dir)
        except Exception:
            try:
                ftp.mkd(target_dir)
            except ftplib.error_perm:
                pass
            ftp.cwd(target_dir)

        # Get remote file sizes in current directory
        remote_file_map = {}
        try:
            for name, facts in ftp.mlsd():
                if facts.get('type') == 'file':
                    remote_file_map[name] = int(facts.get('size', -1))
        except Exception:
            pass

        for item in sorted(os.listdir(local_base)):
            local_full = os.path.join(local_base, item)
            child_remote = ('/' + target_dir.strip('/') + '/' + item).replace('//', '/')

            if os.path.isdir(local_full):
                try:
                    ftp.mkd(child_remote)
                except ftplib.error_perm:
                    pass
                upload_dir(local_full, child_remote)
                # Restore parent cwd after child returns
                try:
                    ftp.cwd(target_dir)
                except Exception:
                    pass
            else:
                # Skip sensitive local config if any
                if item == 'env.php':
                    continue
                file_size = os.path.getsize(local_full)

                # Always force upload for core entry files to ensure immediate updates
                force_upload = item in ('index.html', '.htaccess')

                # Delta Check: Skip if remote file exists and has identical size
                if not force_upload and item in remote_file_map and remote_file_map[item] == file_size:
                    print(f'  [CACHE HIT] {child_remote} (unchanged, {file_size} bytes)')
                    continue

                print(f'  -> Uploading {child_remote} ({file_size} bytes)...')
                with open(local_full, 'rb') as f:
                    ftp.storbinary(f'STOR {item}', f)

    print(f'Synchronizing payload from {local_dir} to {base_remote} with Delta Caching...')
    upload_dir(local_dir, base_remote)

    # Write verification marker to remote root
    try:
        ftp.cwd(base_remote if base_remote else '/')
        import io
        marker_data = io.BytesIO(b'DEPLOY_OK_COMMIT_VERIFIED\n')
        ftp.storbinary('STOR deploy_test_marker.txt', marker_data)
        print('Wrote deploy_test_marker.txt to remote root successfully.')
    except Exception as e:
        print(f'Warning: Could not write deploy_test_marker.txt: {e}')

    print('Deployment completed successfully!')
    ftp.quit()

if __name__ == '__main__':
    main()

