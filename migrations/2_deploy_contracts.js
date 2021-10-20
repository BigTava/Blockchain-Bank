const Token = artifacts.require("Token");
const Bank = artifacts.require("Bank");

module.exports = async function (deployer, network, accounts) {
    
    // Deploy XYZ Token
    await deployer.deploy(Token);
    const token = await Token.deployed();

    // Deploy Bank
    const timePeriodMinutes = 1;
    const rewardPool = 1000;

    await deployer.deploy(Bank, token.address, timePeriodMinutes, rewardPool);
    const bank = await Bank.deployed();

    await token.transfer(bank.address, rewardPool);
};
