URL paiement succès : /cart/success
URL paiement échec : /cart/success

# BUILD
To build the default theme, you need to execute the commands in your terminal (in the root of aquila) :
Windows : npm run build:win --theme=default_theme
Linux : npm run build:linux --theme=default_theme

# TESTING
To run cypress, you need to execute some commands in your terminal.

Firstly, you will need to execute ths following command:
'npm install'

After that, a node_modules folder will be created.
To run cypress, you will need to exexute this command:
'npm run cypress'

Cypress is now open.
Tu run tests, you can click on files in cypress. It will open them in navigator and run them.
After test validation or failure, you will be able to click on each state of the test to see in console a lot of informations
about what he was doing at the moment. You can also see html code of the page, or the page at this state.
You can run them again by clicking on the button 'run all tests', pressing 'R', refreshing the page or saving the script file.

To add a test in cypress, you need to add anonther file in 'cypress/integration' folder.
This folder contains all your test scripts