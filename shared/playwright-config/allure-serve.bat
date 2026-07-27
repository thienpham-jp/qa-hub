@echo off
REM Generic script, meant to be run with cwd = a project folder (projects/<name>/).
set "JAVA_HOME=C:\Program Files\JetBrains\IntelliJ IDEA Community Edition 2025.2.6.1\jbr"
REM Carry the trend/history forward from the previous report so it is not lost.
if exist reports\allure-report\history (
  if not exist reports\allure-results mkdir reports\allure-results
  xcopy /e /i /y reports\allure-report\history reports\allure-results\history >nul
)
npx allure generate reports\allure-results --clean -o reports\allure-report
npx allure open reports\allure-report -p 5252
