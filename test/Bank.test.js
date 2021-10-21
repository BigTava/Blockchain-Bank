const { assert } = require('chai');

const Token = artifacts.require("Token");
const Bank = artifacts.require("Bank");

const utils = require("./helpers/utils");
const timeMachine = require('ganache-time-traveler');

require('chai')
    .use(require('chai-as-promised'))
    .should()

function tokens(n) {
    return web3.utils.toWei(n, 'ether');
}

contract('Bank', ([owner, user1, user2]) => {

    let token, bank
    let timePeriod   = 1
    let rewardPool   = tokens('1000')
    let balanceUser1 = tokens('1000')
    let balanceUser2 = tokens('4000')

    let t0, period

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

    beforeEach(async() => {
        let snapshot = await timeMachine.takeSnapshot();
        snapshotId = snapshot['result'];
    });

    afterEach(async() => {
        await timeMachine.revertToSnapshot(snapshotId);
    });

    // Testing Token
    describe('XYZ deployment', async () => {
        it('has a name', async () => {
            const name = await token.name()
            assert.equal(name, 'XYZ Token')
        });
    });

    // Testing Bank deployment
    describe('Bank deployment', async () => {
        it('contract has Reward Pool', async () => {
            let balance = await token.balanceOf(bank.address)
            assert.equal(balance, rewardPool)
        });
    });
    
    describe('Staking Tokens', async () => {

        it('user should be able to stake tokens at period 1', async () => {
            let result

            // Check user1 balance before staking
            result = await token.balanceOf(user1)
            assert.equal(result.toString(), balanceUser1, 'user1 XYZ wallet balance')
            
            // Stake XYZ
            await token.approve(bank.address, balanceUser1, { from: user1 })
            await bank.stakeTokens(balanceUser1, { from: user1})
            let user = await bank.users.call(user1)
            let isStaking = user.isStaking
            let stakingBalance = user.stakingBalance

            // Check staking result
            result = await token.balanceOf(user1)
            assert.equal(result.toString(), tokens('0'), 'user1 XYZ wallet balance correct after staking')
            assert.equal(isStaking.toString(), 'true', 'user1 is staking')
            assert.equal(stakingBalance.toString(), balanceUser1.toString(), 'user1 staking balance is correct')

            // Check balance of bank
            result = await token.balanceOf(bank.address)
            assert.equal(result.toString(), parseInt(rewardPool) + parseInt(balanceUser1), 'bank wallet balance correct after user1 staking')
        });

        it('user should not be able to stake tokens at period 2', async () => {
            await timeMachine.advanceTimeAndBlock(60);

            await token.approve(bank.address, balanceUser1, { from: user1 }) 
            await utils.shouldThrow(bank.stakeTokens(balanceUser1, { from: user1}));

            // Check staking result
            result = await token.balanceOf(user1)
            assert.equal(result.toString(), balanceUser1, 'user1 XYZ wallet balance is the same')
            
            // Check balance of bank
            result = await token.balanceOf(bank.address)
            assert.equal(result.toString(), parseInt(rewardPool), 'bank wallet balance is the same')
        });

        it('user should not be able to stake tokens if it is already staking', async () => {

            await token.approve(bank.address, tokens('500'), { from: user1 }) 
            await bank.stakeTokens(tokens('500'), { from: user1});
        
            await token.approve(bank.address, tokens('500'), { from: user1 }) 
            await utils.shouldThrow(bank.stakeTokens(tokens('500'), { from: user1}));

            // Check staking result
            result = await token.balanceOf(user1)
            assert.equal(result.toString(), tokens('500'), 'user1 XYZ wallet balance is the same')
            
            // Check balance of bank
            result = await token.balanceOf(bank.address)
            assert.equal(result.toString(), parseInt(rewardPool) + parseInt(tokens('500')), 'bank wallet balance is the same')
        });
    });
    
    describe('unstaking XYZ tokens and receive rewards', async () => {

        beforeEach(async () => {

            let stakeUser1 = tokens('500')
            let stakeUser2 = tokens('500')
            await token.approve(bank.address, stakeUser1, { from: user1 }) 
            await bank.stakeTokens(stakeUser1, { from: user1 })

            /*await token.approve(bank.address, tokens('500'), { from: user2 }) 
            await bank.stakeTokens(tokens('500'), { from: user2});*/
        });

        it('user should not be able to withdraw tokens before period 3', async () => {
            await timeMachine.advanceTimeAndBlock(60);

            result = await token.balanceOf(bank.address)
            console.log(result.toString())

            result = await token.balanceOf(user1)
            console.log(result.toString())

            await token.approve(user1, stakeUser1, { from: bank.address }) 

            // await utils.shouldThrow(bank.unstakeTokens({ from: user1 }));

        });

    });

})