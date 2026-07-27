import { BasePage } from "./BasePage";

export class AuthenticationPage extends BasePage {

    usernameTextBox = "#username";
    passwordTextBox = "#password";
    loginButton = "button[type=submit]";
    successFlashMessage = ".success";

    async navigate() {
        await this.goto("https://the-internet.herokuapp.com/login");
    }

    async login(username: string, password: string) {
        await this.fill(this.usernameTextBox, username);
        await this.fill(this.passwordTextBox, password);
        await this.click(this.loginButton);
    }

    async isLoggedIn() {
        return (await this.getText(this.successFlashMessage)).includes("You logged into a secure area!");
    }

    async isMessageContent(type: string, message: string) {
        return (await this.getText(`.${type}`)).includes(message);
    }
}