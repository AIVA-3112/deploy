@echo off
cd server
call npm install
call npm run build
cd ..
call npm install
call npm run build
if exist server\public rmdir /s /q server\public
xcopy /E /I /Y dist server\public
cd server
call npm install
node combined.js