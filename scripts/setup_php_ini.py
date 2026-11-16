# Setup php.ini with pdo_sqlite and extensions enabled
with open(r'C:\Users\krish\.php\php.ini-development', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(';extension_dir = "ext"', 'extension_dir = "C:\\Users\\krish\\.php\\ext"')
content = content.replace(';extension=pdo_sqlite', 'extension=pdo_sqlite')
content = content.replace(';extension=sqlite3', 'extension=sqlite3')
content = content.replace(';extension=pdo_mysql', 'extension=pdo_mysql')
content = content.replace(';extension=mysqli', 'extension=mysqli')
content = content.replace(';extension=openssl', 'extension=openssl')
content = content.replace(';extension=mbstring', 'extension=mbstring')
content = content.replace(';extension=curl', 'extension=curl')

with open(r'C:\Users\krish\.php\php.ini', 'w', encoding='utf-8') as f:
    f.write(content)

print("php.ini configured successfully.")
