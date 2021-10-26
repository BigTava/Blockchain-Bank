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

contract('Bank', ([owner, user1, user2, user3]) => {

    let token, bank, ownerBalance
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
    
    describe('Unstaking XYZ tokens and receive rewards', async () => {

        beforeEach(async () => {

            await token.approve(bank.address, balanceUser1, { from: user1 }) 
            await bank.stakeTokens(balanceUser1, { from: user1 })

            await token.approve(bank.address, balanceUser2, { from: user2 }) 
            await bank.stakeTokens(balanceUser2, { from: user2});
        });

        it('user should not be able to withdraw tokens before period 3', async () => {
            await utils.shouldThrow(bank.unstakeTokens({ from: user1 }));

            await timeMachine.advanceTimeAndBlock(60);

            await utils.shouldThrow(bank.unstakeTokens({ from: user1 }));

            // Check balance of bank
            result = await token.balanceOf(bank.address)
            assert.equal(result.toString(), (parseInt(rewardPool)+parseInt(balanceUser1)+parseInt(balanceUser2)), 'bank wallet balance is the same')
        });

        it('user that is not staking should not be able to withdraw tokens', async () => {
            await timeMachine.advanceTimeAndBlock(121);

            // Check if user3 is staking
            let user = await bank.users.call(user3)
            let isStaking = user.isStaking
            let stakingBalance = user.stakingBalance
            assert.equal(isStaking, false, 'user3 is not staking')
            assert.equal(stakingBalance, 0, 'user3 has 0 staking balance')    

            await utils.shouldThrow(bank.unstakeTokens({ from: user3 }));
        });

        it('user 1 should be able to withdraw correspondent staking balance + rewards', async () => {

            await timeMachine.advanceTimeAndBlock(121);

            // Check if period is 3
            let period = await bank.getCurrentPeriod()
            assert.equal(period, 3, 'user1 is withdrawing at period 3')   
            
            bank.unstakeTokens({ from: user1 })

            // Check balance user1
            balance = await token.balanceOf(user1)
            assert.equal(balance.toString(), tokens('1040'), 'user1 has received stake balance + rewards')
            
            // Check state of user1
            let user = await bank.users.call(user1)
            let isStaking = user.isStaking
            let stakingBalance = user.stakingBalance
            assert.equal(isStaking, false, 'user1 is not staking')
            assert.equal(stakingBalance, tokens('0'), 'user3 has a 0 staking balance')
        });

        it('user 2 should be able to withdraw correspondent staking balance + rewards after user 1 unstaking', async () => {

            await timeMachine.advanceTimeAndBlock(121);

            bank.unstakeTokens({ from: user1 })

            await timeMachine.advanceTimeAndBlock(60);

            // Check if period is 4 
            let period = await bank.getCurrentPeriod()
            assert.equal(period, 4, 'user 2 is withdrawing at period 4')   
            
            bank.unstakeTokens({ from: user2 })

            // Check balance user2
            balance = await token.balanceOf(user2)
            assert.equal(balance.toString(), tokens('4460'), 'user 2 has received stake balance + rewards')
            
            // Check state of user2
            let user = await bank.users.call(user2)
            let isStaking = user.isStaking
            let stakingBalance = user.stakingBalance
            assert.equal(isStaking, false, 'user2 is not staking')
            assert.equal(stakingBalance, tokens('0'), 'user2 has a 0 staking balance')
        });
    });

    describe('Bank withdrawal', async () => {

        beforeEach(async () => {

            ownerBalance = await token.balanceOf(owner)
            
            await token.approve(bank.address, balanceUser1, { from: user1 }) 
            await bank.stakeTokens(balanceUser1, { from: user1 })

            await token.approve(bank.address, balanceUser2, { from: user2 }) 
            await bank.stakeTokens(balanceUser2, { from: user2});
        });
        
        it('bank should be able to withdraw remaining reward pool in period 5', async () => {
            await timeMachine.advanceTimeAndBlock(121);

            bank.unstakeTokens({ from: user1 })

            await timeMachine.advanceTimeAndBlock(60);

            bank.unstakeTokens({ from: user2 })

            await timeMachine.advanceTimeAndBlock(60);

            // Check if period is 5 
            let period = await bank.getCurrentPeriod();
            assert.equal(period, 5, 'bank is withdrawing at period 5');

            let balance = await token.balanceOf(owner)
            bank.bankWithdraw({from: owner});

            // Check owner balance of XYZ tokens
            balance = await token.balanceOf(owner)
            assert.equal(balance.toString(), parseInt(ownerBalance)+parseInt(rewardPool*5/10), 'owner has remaining reward pool');

            // Check bank balance of XYZ tokens
            balance = await token.balanceOf(bank.address)
            assert.equal(balance.toString(), tokens('0'), 'owner has remaining reward pool');
        });

        it('bank should not be able to withdraw remaining reward pool in period below 5 or if there is a user still staking', async () => {
            await timeMachine.advanceTimeAndBlock(181);

            await utils.shouldThrow(bank.bankWithdraw({ from: owner }))

            await timeMachine.advanceTimeAndBlock(60);

            await utils.shouldThrow(bank.bankWithdraw({ from: owner }))
        });
    });
});