import os
import sys
import json
import subprocess
import tempfile
import shutil

def sanitize_latex(text):
    """Escape LaTeX special characters."""
    if not text:
        return ""
    replacements = {
        '&': r'\&',
        '%': r'\%',
        '$': r'\$',
        '#': r'\#',
        '_': r'\_',
        '{': r'\{',
        '}': r'\}',
        '~': r'\textasciitilde{}',
        '^': r'\textasciicircum{}',
        '\\': r'\textbackslash{}',
    }
    for char, replacement in replacements.items():
        text = text.replace(char, replacement)
    return text

def build_pdf(json_path, output_pdf_path):
    # Read payload
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    session_id = sanitize_latex(data.get('session_id', ''))
    date = sanitize_latex(data.get('date', ''))
    time = sanitize_latex(data.get('time', ''))
    career = sanitize_latex(data.get('career', 'Facultad de Ingeniería Mecánica y Eléctrica'))
    role_type = sanitize_latex(data.get('role_type', 'Jefe / Subjefe'))
    
    agenda = [sanitize_latex(item) for item in data.get('agenda', [])]
    agreements = [sanitize_latex(item) for item in data.get('agreements', [])]
    attendees = data.get('attendees', [])

    # LaTeX source template
    tex_template = r"""
\documentclass[11pt,letterpaper]{article}
\usepackage[utf8]{inputenc}
\usepackage[spanish]{babel}
\usepackage[margin=1in]{geometry}
\usepackage{helvet}
\usepackage{booktabs}
\usepackage{fancyhdr}
\usepackage{tabularx}

\renewcommand{\familydefault}{\sfdefault}

% Headers and Footers configuration
\pagestyle{fancy}
\fancyhf{}
\renewcommand{\headrulewidth}{1pt}
\renewcommand{\footrulewidth}{0.5pt}
\fancyhead[L]{\textbf{UNIVERSIDAD DE COLIMA} \\ Facultad de Ingeniería Mecánica y Eléctrica}
\fancyhead[R]{\textbf{ACTA DE ACADEMIA} \\ Sesión: """ + session_id + r"""}
\fancyfoot[C]{\thepage}
\fancyfoot[R]{UCOL - FIME}

\setlength{\headheight}{32pt}
\setlength{\marginparwidth}{0pt}

\begin{document}

% Title Header
\vspace*{10px}
\begin{center}
    {\large\textbf{CONSTATACIÓN DE HECHOS Y ACUERDOS DE ASAMBLEA ESTUDIANTIL}} \\
    \vspace{5px}
    {\small Carrera: } \textbf{""" + (career if career else "General / Todas las carreras") + r"""}
\end{center}
\vspace{15px}

% Session Metadata Block
\noindent
\begin{tabularx}{\textwidth}{l X}
    \toprule
    \textbf{Identificador de Sesión:} & """ + session_id + r""" \\
    \textbf{Fecha del Evento:} & """ + date + r""" \\
    \textbf{Hora de Inicio:} & """ + time + r""" Hrs \\
    \textbf{Rol Convocado:} & """ + role_type + r""" \\
    \bottomrule
\end{tabularx}

\vspace{25px}

% Agenda Section
\noindent
{\large\textbf{1. ORDEN DEL DÍA (Puntos a tratar)}} \\
\rule{\textwidth}{1px}
\vspace{5px}
\begin{enumerate}
"""
    for item in agenda:
        tex_template += f"    \\item {item}\n"
    
    tex_template += r"""\end{enumerate}

\vspace{20px}

% Agreements Section
\noindent
{\large\textbf{2. ACUERDOS DE LA ASAMBLEA}} \\
\rule{\textwidth}{1px}
\vspace{5px}
\begin{enumerate}
"""
    if agreements:
        for item in agreements:
            tex_template += f"    \\item \\textbf{{{item}}}\n"
    else:
        tex_template += "    \\item \\textit{No se registraron acuerdos específicos en esta asamblea.}\n"

    tex_template += r"""\end{enumerate}

\vspace{25px}
\newpage

% Attendance Section
\noindent
{\large\textbf{3. REGISTRO DE ASISTENCIA Y FIRMA DE CONFORMIDAD}} \\
\rule{\textwidth}{1px}
\vspace{10px}

\begin{tabularx}{\textwidth}{l l l c c X}
    \toprule
    \textbf{Matrícula} & \textbf{Nombre} & \textbf{Grado/Gpo} & \textbf{Rol} & \textbf{Asistencia} & \textbf{Firma} \\
    \midrule
"""

    for student in attendees:
        std_name = sanitize_latex(student.get('full_name', ''))
        std_enrollment = sanitize_latex(student.get('enrollment', ''))
        std_role = sanitize_latex(student.get('role', ''))
        std_career = sanitize_latex(student.get('career', ''))
        std_grade = student.get('grade', '')
        std_group = sanitize_latex(student.get('group_letter', ''))
        
        attended_val = "SÍ" if student.get('attended') == 1 else "NO"
        firma_line = r"\underline{\hspace{2.2cm}}" if student.get('attended') == 1 else "---"

        tex_template += f"    {std_enrollment} & {std_name} & {std_grade}°{std_group} & {std_role} & {attended_val} & {firma_line} \\\\\n"

    tex_template += r"""    \bottomrule
\end{tabularx}

\vspace{45px}

% Signature lines for authorities
\noindent
\begin{minipage}[t]{0.45\textwidth}
    \centering
    \rule{6cm}{0.5pt} \\
    \vspace{2px}
    {\small Jefatura de Carrera / Director \\ FIME UCOL}
\end{minipage}
\hfill
\begin{minipage}[t]{0.45\textwidth}
    \centering
    \rule{6cm}{0.5pt} \\
    \vspace{2px}
    {\small Representante de Sociedad de Alumnos \\ FIME UCOL}
\end{minipage}

\end{document}
"""

    # Compile LaTeX in a temp directory
    temp_dir = tempfile.mkdtemp()
    tex_path = os.path.join(temp_dir, 'acta.tex')
    
    try:
        with open(tex_path, 'w', encoding='utf-8') as f:
            f.write(tex_template)
        
        # Run pdflatex
        result = subprocess.run(
            ['pdflatex', '-interaction=nonstopmode', 'acta.tex'],
            cwd=temp_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        compiled_pdf = os.path.join(temp_dir, 'acta.pdf')
        
        if result.returncode == 0 and os.path.exists(compiled_pdf):
            # Success - copy back output
            shutil.copy(compiled_pdf, output_pdf_path)
            print("PDF generated successfully via pdflatex!")
            return True
        else:
            print(f"pdflatex failed with return code {result.returncode}")
            print(f"stdout: {result.stdout}")
            print(f"stderr: {result.stderr}")
            return False
            
    finally:
        # Clean up temp files
        shutil.rmtree(temp_dir)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 generate_pdf.py <input_json_path> <output_pdf_path>")
        sys.exit(1)

    json_input = sys.argv[1]
    pdf_output = sys.argv[2]
    
    success = build_pdf(json_input, pdf_output)
    if not success:
        sys.exit(2)
