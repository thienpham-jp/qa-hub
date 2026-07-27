import { BasePage } from "./BasePage";

export class IstoolsPage extends BasePage {
  usernameTextBox = "role=textbox[name='ID']";
  passwordTextBox = "role=textbox[name='Password']";
  loginButton = "role=button[name='Login']";

  async open() {
    await this.goto("https://st-istools-id.asean-accesstrade.net/s/login");
  }

  async login(username: string, password: string) {
    await this.fill(this.usernameTextBox, username);
    await this.fill(this.passwordTextBox, password);
    await this.click(this.loginButton);
  }

  async getErrorMessage() {
    return await this.getText("[id='username.errors']");
  }
}
