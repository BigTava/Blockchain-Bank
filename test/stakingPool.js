const { assert } = require('chai');

const Token = artifacts.require("Token");
const Bank = artifacts.require("Bank");

require('chai')
    .use(require('chai-as-promised'))
    .should()

function tokens(n) {
    return web3.utils.toWei(n, 'ether');
}

contract('StakingPool', ([owner, user1, user2]) => {

    let token, bank
    let timePeriod   = 1
    let rewardPool   = tokens('1000')
    let balanceUser1 = tokens('1000')
    let balanceUser2 = tokens('4000')

    before(async () => {
        token = await Token.new()
        bank  = await Bank.new(token.address, timePeriod, rewardPool)
        
        // Transfer Reward Pool of XYZ tokens to the bank smart contract
        await token.transfer(bank.address, rewardPool)

        // Transfer XYZ to user 1
        await token.transfer(user1, balanceUser1)

        // Transfer XYZ to user 2
        await token.transfer(user2, balanceUser2)
    })

    // Testing Token
    describe('XYZ deployment', async () => {
        it('has a name', async () => {
            const name = await token.name()
            assert.equal(name, 'XYZ Token')
        })
    })

    // Testing Bank deployment
    describe('Bank deployment', async () => {
        it('contract has Reward Pool', async () => {
            let balance = await token.balanceOf(bank.address)
            assert.equal(balance, rewardPool)
        })
    })
    
    describe('Staking Tokens', async () => {
        it('rewards investor1 for staking xyz tokens', async () => {
            let result

            // Check user1 balance before staking
            result = await token.balanceOf(user1)
            assert.equal(result.toString(), balanceUser1, 'user1 XYZ wallet balance')
            
            // Stake XYZ
            await token.approve(bank.address, balanceUser1, { from: user1 })
            await bank.stakeTokens(balanceUser1, { from: user1})

            // Check staking result
            result = await token.balanceOf(user1)
            assert.equal(result.toString(), tokens('0'), 'user1 XYZ wallet balance correct after staking')
            
            // Check balance of bank
            result = await token.balanceOf(bank.address)
            assert.equal(result.toString(), parseInt(rewardPool) + parseInt(balanceUser1), 'bank wallet balance correct after user1 staking')
            
        })
    })
})