@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"
echo ================================================
echo   محل أحمد الجمال - إنشاء EXE لويندوز 64-bit
echo ================================================
where node >nul 2>&1 || (echo [خطأ] Node.js غير مثبت. ثبّت Node.js LTS ثم أعد المحاولة.&pause&exit /b 1)
where npm >nul 2>&1 || (echo [خطأ] npm غير موجود.&pause&exit /b 1)
if not exist package.json (echo [خطأ] package.json غير موجود.&pause&exit /b 1)
if not exist build\icon.ico (echo [خطأ] build\icon.ico غير موجود.&pause&exit /b 1)
echo.
echo [1/3] تثبيت مكونات البرنامج...
call npm install --no-audit --no-fund
if errorlevel 1 goto :fail
echo.
echo [2/3] إنشاء EXE 64-bit (تثبيت + نسخة محمولة)...
call npx electron-builder --win nsis portable --x64
if errorlevel 1 goto :fail
echo.
echo [3/3] تم بنجاح.
echo ملفات EXE موجودة في:
echo %~dp0dist
dir /b dist\*.exe 2>nul
pause
exit /b 0
:fail
echo.
echo [خطأ] فشل إنشاء EXE. راجع الرسالة السابقة وتأكد من اتصال الإنترنت.
pause
exit /b 1
