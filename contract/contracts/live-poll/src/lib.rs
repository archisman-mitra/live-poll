#![no_std]
use soroban_sdk::{
    contract,
    contractimpl,
    contracttype,
    symbol_short,
    Address,
    Env,
    Symbol,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Votes(Symbol),
    HasVoted(Address),
}

#[contract]
pub struct PollContract;

#[contractimpl]
impl PollContract {
    pub fn vote(env: Env, voter: Address, option: Symbol) {
        voter.require_auth();

        if option != symbol_short!("java") && option != symbol_short!("python") {
            panic!("invalid option");
        }

        let voted_key = DataKey::HasVoted(voter.clone());
        if env.storage().persistent().has(&voted_key) {
            panic!("already voted");
        }

        let vote_key = DataKey::Votes(option.clone());
        let current: u32 = env.storage().persistent().get(&vote_key).unwrap_or(0);
        env.storage().persistent().set(&vote_key, &(current + 1));
        env.storage().persistent().set(&voted_key, &true);

        env.events().publish((symbol_short!("voted"),), (voter, option));
    }

    pub fn get_votes(env: Env, option: Symbol) -> u32 {
        let vote_key = DataKey::Votes(option);
        env.storage().persistent().get(&vote_key).unwrap_or(0)
    }

    pub fn has_voted(env: Env, voter: Address) -> bool {
        env.storage().persistent().has(&DataKey::HasVoted(voter))
    }
}