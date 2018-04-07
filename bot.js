const Discord = require("discord.io");
const auth = require("./auth.json");
const fs = require("fs");
const table = require("text-table");

class Fembot {
  constructor() {
    this.bot = new Discord.Client({
      token: auth.token,
      autorun: true
    }).on("ready", evt => {
      console.log("Connected");
      console.log("Logged in as: ");
      console.log(this.bot.username + " - (" + this.bot.id + ")");
      this.messageHandler();
    });
    fs.readFile("dkp.json", (err, data) => {
      if (err) {
        throw err;
      }
      this.dkpScores = JSON.parse(data);
    });

    this.maxDailyDKP = 100;
  }

  messageHandler() {
    this.bot.on("message", async (user, userID, channelID, message, evt) => {
      if (message.substring(0, 1) == "!" && user != "fembot") {
        let command = message.substring(1).split(" ")[0];

        const commands = {
          roll: () => {
            this.rollDice(user, channelID, message);
          },
          dkp: () => {
            this.dkpCommand(user, channelID, message);
          },
          default: () => {
            this.sendMessage(channelID, "```diff\n- Invalid command```");
          }
        };

        typeof commands[command] == "function"
          ? commands[command]()
          : commands["default"]();
      }
    });
  }

  async sendMessage(channelID, botMessage) {
    this.bot.sendMessage({
      to: channelID,
      message: botMessage
    });
  }

  giveOrTakeValidator(user, channelID, command) {
    let botMessage;
    let operator = command.split(" ")[0];
    let amount = parseInt(command.split(" ")[1]);
    let targetUser = command.split(" ")[2];
    let num = 3;
    while (command.split(" ")[num]) {
      targetUser += ` ${command.split(" ")[num]}`;
      num += 1;
    }

    if (amount > this.maxDailyDKP) {
      botMessage = `\`\`\`diff\n- Too much DKP, max ${this.maxDailyDKP}\`\`\``;
      this.sendMessage(channelID, botMessage);
      return;
    }

    if (targetUser == user) {
      botMessage = `\`\`\`diff\n- That would be silly, you silly goose.\`\`\``;
      this.sendMessage(channelID, botMessage);
      return;
    }

    this.giveOrTakeDKP(user, targetUser, amount, operator, channelID);
  }

  dkpCommand(user, channelID, message) {
    let botMessage;
    let directives = message.split("!dkp ")[1];
    let command = message.split("!dkp ")[1];
    if (typeof directives != "undefined") {
      command = directives.split(" ")[0];
    }

    const commands = {
      list: () => {
        this.dkpList(channelID);
      },
      dice: () => {
        this.dkpDice(user, channelID, directives);
      },
      give: () => {
        this.giveOrTakeValidator(user, channelID, directives);
      },
      take: () => {
        this.giveOrTakeValidator(user, channelID, directives);
      },
      default: () => {
        this.sendMessage(channelID, this.tmplDkpCommands());
      }
    };

    typeof commands[command] == "function"
      ? commands[command]()
      : commands["default"]();
  }

  dkpList(channelID) {
    let botMessage = "```css\n";
    let tableUsers = [["User", "DKP"]];
    for (let user of this.dkpScores.users) {
      tableUsers.push([user.username, user.dkp]);
    }
    botMessage += table(tableUsers, { align: ["l", "r"] }) + "```";
    this.sendMessage(channelID, botMessage);
  }

  invalidCommand(channelID) {
    let botMessage = `\`\`\`diff\n- Invalid command. Type !dkp for commands\`\`\``;
    this.sendMessage(channelID, botMessage);
  }

  rollDice(user, channelID, message) {
    let botMessage;
    var args = message.substring(1).split(" ");
    var cmd = args[0];

    args = args.splice(1);
    switch (cmd) {
      case "roll":
        let roll = Math.floor(Math.random() * 100) + 1;

        if (user == "Julius Caesar") {
          roll = -1;
        }

        botMessage = `\`\`\`xl\n${user} rolled ${roll}\`\`\``;
        this.sendMessage(channelID, botMessage);
        return roll;
        break;
    }
  }

  dkpDice(user, channelID, directives) {
    let users = this.dkpScores.users;
    let userIndex = this.getUserIndex(user);

    let amount = parseInt(directives.split(" ")[1]);
    let choice = directives.split(" ")[2];

    if (
      choice == "high" ||
      choice == "h" ||
      choice == "low" ||
      choice == "l" ||
      choice == 7
    ) {
      if (users[userIndex].dkp >= amount) {
        users[userIndex].dkp -= amount;
        let diceOne = Math.floor(Math.random() * 6) + 1;
        let diceTwo = Math.floor(Math.random() * 6) + 1;
        let diceSum = diceOne + diceTwo;

        let botMessage =
          "```diff\n! You place your " +
          amount +
          " DKP bet on " +
          (choice == "h" || choice == "l"
            ? choice == "h" ? (choice = "high") : (choice = "low")
            : choice) +
          "\n" +
          "\n+ First dice    : " +
          diceOne +
          "\n+ Second dice   : " +
          diceTwo +
          "\n+ Dice total    : " +
          diceSum +
          "\n\n";

        let winnings = 0;
        if (choice == 7 && diceSum == 7) {
          winnings = amount * 4;
          users[userIndex].dkp += winnings;
          botMessage += `+ Holy smokes, you just won ${winnings} DKP, `;
        } else if ((choice == "high" || choice == "h") && diceSum > 7) {
          winnings = amount * 2;
          users[userIndex].dkp += winnings;
          botMessage += `+ Sweet, you just won ${winnings} DKP, `;
        } else if ((choice == "low" || choice == "l") && diceSum < 7) {
          winnings = amount * 2;
          users[userIndex].dkp += winnings;
          botMessage += `+ Sweet, you just won ${winnings} DKP, `;
        } else {
          botMessage += "- You loose your hard earned DKP, ";
        }
        botMessage += "setting your total to " + users[userIndex].dkp + "```";
        this.sendMessage(channelID, botMessage);
        this.saveDKP();
      } else {
        this.sendMessage(
          channelID,
          `\`\`\`diff\n- Not enough DKP, you only have ${
            users[userIndex].dkp
          }\`\`\``
        );
      }
    } else {
      this.sendMessage(channelID, "-Invalid command");
    }
  }

  getUserIndex(username) {
    let users = this.dkpScores.users;
    let index = users.findIndex(user => user.username == username);
    //if current user is missing, check if he exist and save him
    if (index == -1) {
      for (let user in this.bot.users) {
        if (this.bot.users[user].username == username) {
          users.push({
            username: this.bot.users[user].username,
            id: this.bot.users[user].id,
            dkp: 0,
            bank: {
              lastUpdate: new Date(new Date().toJSON().split("T")[0]),
              dkp: 100
            }
          });
          index = users.length - 1;
          break;
        }
      }
    }
    return index;
  }

  async giveOrTakeDKP(currentUser, targetUser, amount, modifier, channelID) {
    let users = this.dkpScores.users;
    let targetUserIndex = this.getUserIndex(targetUser);
    let userIndex = this.getUserIndex(currentUser);

    let botMessage = "";
    if (targetUserIndex >= 0 && userIndex >= 0) {
      let now = new Date(new Date().toJSON().split("T")[0]);
      let then = new Date(
        new Date(users[userIndex].bank.lastUpdate).toJSON().split("T")[0]
      );

      if (Math.abs(now - then) >= 86400000) {
        users[userIndex].bank.dkp = this.maxDailyDKP;
        users[userIndex].bank.lastUpdate = now;
      }

      if (users[userIndex].bank.dkp >= amount) {
        users[userIndex].bank.dkp -= amount;
        if (modifier == "give") {
          users[targetUserIndex].dkp += amount;
          botMessage = `\`\`\`diff\n+ Gave ${amount} DKP to `;
        } else if (modifier == "take") {
          users[targetUserIndex].dkp -= Math.floor(amount / 2);
          botMessage = `\`\`\`diff\n+ Took ${Math.floor(amount / 2)} DKP from `;
        }
        botMessage += `${targetUser}, you now have ${
          users[userIndex].bank.dkp
        } more DKP to give or take today.\`\`\``;
        this.saveDKP();
      } else {
        botMessage = `\`\`\`diff\n- Not enough DKP, you only have ${
          users[userIndex].bank.dkp
        }\`\`\``;
      }
    } else {
      botMessage = `\`\`\`diff\n- Did not find the username ${targetUser}\`\`\``;
    }
    this.sendMessage(channelID, botMessage);
  }

  saveDKP() {
    let json = JSON.stringify(this.dkpScores);
    fs.writeFile("dkp.json", json, "utf8");
  }

  tmplDkpCommands() {
    let msg =
      "```diff\n" +
      "You're allowed to give and take a total of " +
      this.maxDailyDKP +
      " DKP every 24-hour period." +
      "\n\ncommands:" +
      "\n!dkp - show dkp commands" +
      "\n!dkp list - list all users and their DKP" +
      "\n!dkp give <amount> <user> - give DKP to a user" +
      "\n!dkp take <amount> <user> - take DKP from a user (diminishing returns 50%)" +
      "\n!dkp dice <amount> high/low/7 - feeling lucky? (h/l for short)" +
      "\n\nexamples:" +
      "\n!dkp give 10 Tin" +
      "\n!dkp take 10 Tin" +
      "\n!dkp dice 50 h" +
      "\n!dkp dice 50 7```";
    return msg;
  }
}

let bot = new Fembot();
