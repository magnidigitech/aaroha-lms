import glob
import re

for f in sorted(glob.glob('aaroha_lms/frontend/src/components/admin/*.jsx')):
    with open(f, 'r', encoding='utf-8') as handle:
        content = handle.read()
    orig = content
    # replace dark tint borders with light borders
    content = re.sub(r'border-(rose|amber|purple|emerald|blue|cyan|indigo)-900[^\s\"\'\`]*', r'border-\1-200', content)
    content = re.sub(r'border-(rose|amber|purple|emerald|blue|cyan|indigo)-800[^\s\"\'\`]*', r'border-\1-200', content)
    content = re.sub(r'bg-(rose|amber|purple|emerald|blue|cyan|indigo)-100/20', r'bg-\1-50', content)
    content = re.sub(r'bg-(rose|amber|purple|emerald|blue|cyan|indigo)-950[^\s\"\'\`]*', r'bg-\1-50', content)
    content = re.sub(r'text-(rose|amber|purple|emerald|blue|cyan|indigo)-300', r'text-\1-800', content)
    if content != orig:
        with open(f, 'w', encoding='utf-8') as out:
            out.write(content)
        print('Cleaned up residual styles in', f)
print('Done.')

