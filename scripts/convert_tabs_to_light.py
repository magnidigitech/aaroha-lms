import os
import re

admin_dir = r'c:\Users\krish\.gemini\antigravity\scratch\aaroha_lms\frontend\src\components\admin'

files = [
    'AdminAnnouncementsTab.jsx',
    'AdminAssessmentsTab.jsx',
    'AdminAttendanceTab.jsx',
    'AdminAuditLogTab.jsx',
    'AdminBatchesTab.jsx',
    'AdminCertificatesTab.jsx',
    'AdminFacultyTab.jsx',
    'AdminFeesTab.jsx',
    'AdminFollowupsTab.jsx',
    'AdminMaterialsTab.jsx',
    'AdminPlacementTab.jsx',
    'AdminReportsTab.jsx',
    'AdminScheduleTab.jsx',
    'AdminSettingsTab.jsx',
    'AdminStudentsTab.jsx',
    'AdminSupportTab.jsx',
    'AdminUsersTab.jsx'
]

def transform_line(line):
    # Preserve modal backdrops: e.g. fixed inset-0 bg-slate-950/70
    if 'fixed inset-0' in line and ('bg-slate-950' in line or 'bg-black' in line):
        return line

    # Replace layout backgrounds
    # Cards and containers
    line = re.sub(r'\bbg-slate-900/60\b', 'bg-white', line)
    line = re.sub(r'\bbg-slate-900/80\b', 'bg-white', line)
    line = re.sub(r'\bbg-slate-900/90\b', 'bg-white', line)
    line = re.sub(r'\bbg-slate-900\b', 'bg-white', line)
    line = re.sub(r'\bbg-slate-950/60\b', 'bg-slate-50', line)
    line = re.sub(r'\bbg-slate-950/50\b', 'bg-slate-50', line)
    line = re.sub(r'\bbg-slate-950/40\b', 'bg-slate-50', line)
    line = re.sub(r'\bbg-slate-950/70\b', 'bg-slate-50', line)
    line = re.sub(r'\bbg-slate-950/30\b', 'bg-slate-50', line)
    line = re.sub(r'\bbg-slate-950\b', 'bg-slate-50', line)
    line = re.sub(r'\bbg-slate-850\b', 'bg-slate-50', line)
    
    # Secondary backgrounds (table headers, item rows)
    line = re.sub(r'\bbg-slate-800/80\b', 'bg-slate-100/70', line)
    line = re.sub(r'\bbg-slate-800/70\b', 'bg-slate-100/70', line)
    line = re.sub(r'\bbg-slate-800/60\b', 'bg-slate-100/70', line)
    line = re.sub(r'\bbg-slate-800/50\b', 'bg-slate-100/70', line)
    # Check if bg-slate-800 is a button or container
    if 'rounded-full' in line or 'rounded-xl' in line or 'rounded-lg' in line:
        line = re.sub(r'\bbg-slate-800\b', 'bg-slate-100', line)
    else:
        line = re.sub(r'\bbg-slate-800\b', 'bg-slate-50', line)

    # Borders
    line = re.sub(r'\bborder-slate-800/80\b', 'border-slate-200', line)
    line = re.sub(r'\bborder-slate-800/60\b', 'border-slate-200', line)
    line = re.sub(r'\bborder-slate-800\b', 'border-slate-200', line)
    line = re.sub(r'\bborder-slate-700/50\b', 'border-slate-200', line)
    line = re.sub(r'\bborder-slate-700/60\b', 'border-slate-200', line)
    line = re.sub(r'\bborder-slate-700\b', 'border-slate-200', line)
    line = re.sub(r'\bdivide-slate-800/60\b', 'divide-slate-100', line)
    line = re.sub(r'\bdivide-slate-800\b', 'divide-slate-100', line)
    line = re.sub(r'\bdivide-slate-700\b', 'divide-slate-100', line)

    # Hover states
    line = re.sub(r'\bhover:border-slate-700\b', 'hover:border-slate-300', line)
    line = re.sub(r'\bhover:border-slate-600\b', 'hover:border-slate-300', line)
    line = re.sub(r'\bhover:bg-slate-800\b', 'hover:bg-slate-100', line)
    line = re.sub(r'\bhover:bg-slate-700\b', 'hover:bg-slate-100', line)

    # Accents & Brand
    line = re.sub(r'\btext-cyan-400\b', 'text-[#0A7CB3]', line)
    line = re.sub(r'\btext-cyan-300\b', 'text-[#086491]', line)
    line = re.sub(r'\bbg-cyan-950\b', 'bg-sky-50', line)
    line = re.sub(r'\bbg-cyan-900/80\b', 'bg-sky-100', line)
    line = re.sub(r'\bbg-cyan-900\b', 'bg-sky-100', line)
    line = re.sub(r'\bborder-cyan-800/60\b', 'border-sky-200', line)
    line = re.sub(r'\bborder-cyan-800\b', 'border-sky-200', line)
    line = re.sub(r'\bborder-cyan-700/60\b', 'border-sky-200', line)
    line = re.sub(r'\bborder-cyan-700\b', 'border-sky-200', line)

    line = re.sub(r'\bbg-blue-950\b', 'bg-blue-100', line)
    line = re.sub(r'\bborder-blue-800/60\b', 'border-blue-200', line)
    line = re.sub(r'\bborder-blue-800\b', 'border-blue-200', line)
    line = re.sub(r'\btext-blue-300\b', 'text-blue-900', line)

    line = re.sub(r'\bbg-amber-950/50\b', 'bg-amber-50', line)
    line = re.sub(r'\bbg-amber-950\b', 'bg-amber-100', line)
    line = re.sub(r'\bborder-amber-900/30\b', 'border-amber-200', line)
    line = re.sub(r'\bborder-amber-800/60\b', 'border-amber-200', line)
    line = re.sub(r'\bborder-amber-800\b', 'border-amber-200', line)
    line = re.sub(r'\btext-amber-300\b', 'text-amber-900', line)

    line = re.sub(r'\bbg-rose-950/50\b', 'bg-rose-50', line)
    line = re.sub(r'\bbg-rose-950\b', 'bg-rose-100', line)
    line = re.sub(r'\bborder-rose-900/30\b', 'border-rose-200', line)
    line = re.sub(r'\bborder-rose-800/60\b', 'border-rose-200', line)
    line = re.sub(r'\bborder-rose-800\b', 'border-rose-200', line)
    line = re.sub(r'\btext-rose-300\b', 'text-rose-900', line)

    line = re.sub(r'\bbg-purple-950/50\b', 'bg-purple-50', line)
    line = re.sub(r'\bbg-purple-950\b', 'bg-purple-100', line)
    line = re.sub(r'\bborder-purple-900/30\b', 'border-purple-200', line)
    line = re.sub(r'\bborder-purple-800/60\b', 'border-purple-200', line)
    line = re.sub(r'\bborder-purple-800\b', 'border-purple-200', line)
    line = re.sub(r'\btext-purple-300\b', 'text-purple-900', line)

    line = re.sub(r'\bbg-emerald-950\b', 'bg-emerald-100', line)
    line = re.sub(r'\bborder-emerald-800/60\b', 'border-emerald-200', line)
    line = re.sub(r'\bborder-emerald-800\b', 'border-emerald-200', line)
    line = re.sub(r'\btext-emerald-300\b', 'text-emerald-900', line)

    # Text replacements:
    line = re.sub(r'\btext-slate-100\b', 'text-slate-900', line)
    line = re.sub(r'\btext-slate-200\b', 'text-slate-800', line)
    line = re.sub(r'\btext-slate-300\b', 'text-slate-700', line)
    line = re.sub(r'\btext-slate-400\b', 'text-slate-500', line)
    line = re.sub(r'\bplaceholder-slate-500\b', 'placeholder-slate-400', line)
    line = re.sub(r'\bhover:text-white\b', 'hover:text-slate-900', line)

    # For text-white:
    # If the element has a solid dark background button (bg-blue, bg-emerald, bg-rose, bg-[#0A7CB3], bg-slate-900, file:text-white), keep text-white
    has_colored_button = bool(re.search(r'bg-blue-600|bg-blue-500|bg-emerald-600|bg-emerald-500|bg-rose-600|bg-rose-500|bg-\[#0A7CB3\]|bg-slate-900|file:text-white|bg-indigo-600', line))
    if not has_colored_button:
        line = re.sub(r'\btext-white\b', 'text-slate-900', line)

    return line

for fn in files:
    path = os.path.join(admin_dir, fn)
    if not os.path.exists(path):
        print(f"Skipping {fn} (not found)")
        continue
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    new_lines = [transform_line(l) for l in lines]
    new_content = '\n'.join(new_lines)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Processed {fn}")

print("All tab files processed.")

