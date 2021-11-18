```
        .///.                .///.     //.            .//  `/////////////-
       `++:++`              .++:++`    :++`          `++:  `++:......---.`
      `/+: -+/`            `++- :+/`    /+/         `/+/   `++.
      /+/   :+/            /+:   /+/    `/+/        /+/`   `++.
  -::/++::`  /+:       -::/++::` `/+:    `++:      :++`    `++/:::::::::.
  -:+++::-`  `/+:      --++/---`  `++-    .++-    -++.     `++/:::::::::.
   -++.       .++-      -++`       .++.    .++.  .++-      `++.
  .++-         -++.    .++.         -++.    -++``++-       `++.
 `++:           :++`  .++-           :++`    :+//+:        `++:----------`
 -/:             :/-  -/:             :/.     ://:         `/////////////-
```

# Aave Arc Timelock

This repo contains smart contracts to add a timelock to the Aave Arc governance process. This timelock gives a guardian address the opportunity to cancel an approved governance action prior to its execution.

The core contract is the `TimelockExecutorBase`, an abstract contract that contains the logic to facilitate the queueing, delay, cancellation and/or execution of sets of actions sent by the aave governance contract. This base contract is extended in the `ArcTimelock` contract to manage receiving calls from the governance contract and queuing them within the `TimelockExecutorBase`.

This repo is based on the [governance-crosschain-bridges](https://github.com/aave/governance-crosschain-bridges). The `TimelockExecutorBase` is the same as the `BridgeExecutorBase` contract from this repo, just renamed to meet the usecase. The `governance-crosschain-bridges` repo, is an audited repo, and has 100% test coverage that can be accessed and ran within that repo.

## Getting Started

### Setup

- Clone the repo
- Run `npm install`

Follow the next steps to setup the repository:

- Install `docker` and `docker-compose`
- Create an environment file named `.env` and fill out the environment variables per `example.env`
- Make sure the information included in the environment file `.config.env` is correct.

### Running in Docker

Terminal Window 1
`docker-compose up`

Once Terminal Window 1 Loaded - in a separate terminal window - Terminal Window 2: 
`docker-compose exec contracts-env bash`

In Terminal Window 2, run desired scripts from npm package file (i.e `npm run compile`)

### Compile

`npm run compile`

This will compile the available smart contracts.

### Test

All tests will run a fork-based test with the existing deployed versions of aave governance and the aave arc market.

- `test:arc:full:fork` - Runs a full test scenario, executing every action needed for the ARC market launch: deploy the ArcTimelock contract, release the market keys to the ArcTimelock, deploy the AIP payload and submit the governance proposal.

- `test:timelock:full` - The ArcTimelock is set as the ArcMarketAdmin. A proposal is created, queued, voted on, and executed, passing the Aave Governance and the ArcTimelock. It uses a mock proposal to update some market parameters.

- `test:timelock:update"` - The ArcTimelock is set as the ArcMarketAdmin. A proposal is created, queued, voted on, and executed, passing the Aave Governance and the ArcTimelock. It uses a mock proposal to update parameters of the ArcTimelock.

- `test:arc:keys` - Run a simple test scenario for releasing the ARC market keys to the ArcTimelock.


## Arc Timelock

### Deploying parameters

- `ethereumGovernanceExecutor` - the address that will have permission to queue ActionSets. This should be the aave governance executor
- `delay` - the time required to pass after the ActionsSet is queued, before execution
- `gracePeriod` - once execution time passes, you can execute this until the grace period ends
- `minimumDelay` - if the delay is updated by the guardian, it cannot be less than this minimum
- `maximumDelay` - if the delay is updated by the guardian, it cannot be more than this maximum
- `guardian` - the admin address of this contract with the permission to cancel ActionsSets and update the delay value



## License
[BSD-3-Clause](./LICENSE.md)