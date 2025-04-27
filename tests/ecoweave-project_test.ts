import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.2/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

// Constants matching the contract
const PROJECT_STATUS_PROPOSED = 0;
const PROJECT_STATUS_ACTIVE = 1;
const PROJECT_STATUS_COMPLETED = 2;

// Error Codes
const ERR_UNAUTHORIZED = 403;
const ERR_PROJECT_NOT_FOUND = 404;
const ERR_PROJECT_EXISTS = 409;
const ERR_PARTICIPANT_LIMIT_REACHED = 429;
const ERR_INVALID_INPUT = 400;
const ERR_DUPLICATE_REGISTRATION = 422;
const ERR_PROJECT_NOT_ACTIVE = 412;
const ERR_INSUFFICIENT_VOTES = 415;

// Project Creation Tests
Clarinet.test({
  name: "Project creation with complete metadata should succeed",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const block = chain.mineBlock([
      Tx.contractCall(
        "ecoweave-project", 
        "create-project", 
        [
          types.utf8("Beach Cleanup"),
          types.utf8("Remove plastic from local beach"),
          types.utf8("Sunset Beach"),
          types.utf8("Coastline"),
          types.uint(10)
        ],
        deployer.address
      )
    ]);

    // Verify transaction success
    block.receipts[0].result.expectOk().expectUint(0);

    // Verify project details
    const projectDetails = chain.callReadOnlyFn(
      "ecoweave-project", 
      "get-project-details", 
      [types.uint(0)], 
      deployer.address
    );

    projectDetails.result.expectSome();
    const project = projectDetails.result.expectSome();
    project.expectTuple();
    
    assertEquals(project.name, "Beach Cleanup");
    assertEquals(project['current-participants'], 0);
    assertEquals(project.status, PROJECT_STATUS_PROPOSED);
  }
});

Clarinet.test({
  name: "Project creation with missing required fields should fail",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const block = chain.mineBlock([
      // Missing name
      Tx.contractCall(
        "ecoweave-project", 
        "create-project", 
        [
          types.utf8(""),  // Empty name
          types.utf8("Remove plastic from local beach"),
          types.utf8("Sunset Beach"),
          types.utf8("Coastline"),
          types.uint(10)
        ],
        deployer.address
      ),
      // Missing max participants
      Tx.contractCall(
        "ecoweave-project", 
        "create-project", 
        [
          types.utf8("Beach Cleanup"),
          types.utf8("Remove plastic from local beach"),
          types.utf8("Sunset Beach"),
          types.utf8("Coastline"),
          types.uint(0)  // Zero participants
        ],
        deployer.address
      )
    ]);

    // Both transactions should fail with invalid input
    block.receipts[0].result.expectErr().expectUint(ERR_INVALID_INPUT);
    block.receipts[1].result.expectErr().expectUint(ERR_INVALID_INPUT);
  }
});

// Participant Management Tests
Clarinet.test({
  name: "Participant registration for an active project should succeed",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const participant = accounts.get("wallet_1")!;

    const block = chain.mineBlock([
      // Create project
      Tx.contractCall(
        "ecoweave-project", 
        "create-project", 
        [
          types.utf8("Beach Cleanup"),
          types.utf8("Remove plastic from local beach"),
          types.utf8("Sunset Beach"),
          types.utf8("Coastline"),
          types.uint(10)
        ],
        deployer.address
      ),
      // Activate project
      Tx.contractCall(
        "ecoweave-project", 
        "activate-project", 
        [types.uint(0)],
        deployer.address
      ),
      // Register participant
      Tx.contractCall(
        "ecoweave-project", 
        "register-for-project", 
        [types.uint(0)],
        participant.address
      )
    ]);

    // Verify successful registration
    block.receipts[2].result.expectOk();

    // Check participant status
    const participantStatus = chain.callReadOnlyFn(
      "ecoweave-project", 
      "get-participant-status", 
      [types.uint(0), types.principal(participant.address)],
      participant.address
    );

    participantStatus.result.expectSome();
    const status = participantStatus.result.expectSome();
    status.expectTuple();
    assertEquals(status.checked_in, false);
    assertEquals(status.verified, false);
  }
});

Clarinet.test({
  name: "Duplicate project registration should be prevented",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const participant = accounts.get("wallet_1")!;

    const block = chain.mineBlock([
      // Create and activate project
      Tx.contractCall(
        "ecoweave-project", 
        "create-project", 
        [
          types.utf8("Beach Cleanup"),
          types.utf8("Remove plastic from local beach"),
          types.utf8("Sunset Beach"),
          types.utf8("Coastline"),
          types.uint(10)
        ],
        deployer.address
      ),
      Tx.contractCall(
        "ecoweave-project", 
        "activate-project", 
        [types.uint(0)],
        deployer.address
      ),
      // First registration
      Tx.contractCall(
        "ecoweave-project", 
        "register-for-project", 
        [types.uint(0)],
        participant.address
      ),
      // Attempt duplicate registration
      Tx.contractCall(
        "ecoweave-project", 
        "register-for-project", 
        [types.uint(0)],
        participant.address
      )
    ]);

    // First registration should succeed
    block.receipts[2].result.expectOk();
    // Duplicate registration should fail
    block.receipts[3].result.expectErr().expectUint(ERR_DUPLICATE_REGISTRATION);
  }
});

Clarinet.test({
  name: "Project registration should fail when project is full",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const accounts_list = [
      accounts.get("wallet_1")!, 
      accounts.get("wallet_2")!, 
      accounts.get("wallet_3")!
    ];

    // Block to create, activate project, and register 3 participants
    const block = chain.mineBlock([
      // Create project with 2 max participants
      Tx.contractCall(
        "ecoweave-project", 
        "create-project", 
        [
          types.utf8("Beach Cleanup"),
          types.utf8("Remove plastic from local beach"),
          types.utf8("Sunset Beach"),
          types.utf8("Coastline"),
          types.uint(2)
        ],
        deployer.address
      ),
      // Activate project
      Tx.contractCall(
        "ecoweave-project", 
        "activate-project", 
        [types.uint(0)],
        deployer.address
      ),
      // Register first two participants
      Tx.contractCall(
        "ecoweave-project", 
        "register-for-project", 
        [types.uint(0)],
        accounts_list[0].address
      ),
      Tx.contractCall(
        "ecoweave-project", 
        "register-for-project", 
        [types.uint(0)],
        accounts_list[1].address
      ),
      // Third participant registration (should fail)
      Tx.contractCall(
        "ecoweave-project", 
        "register-for-project", 
        [types.uint(0)],
        accounts_list[2].address
      )
    ]);

    // First two registrations should succeed
    block.receipts[2].result.expectOk();
    block.receipts[3].result.expectOk();
    // Third registration should fail
    block.receipts[4].result.expectErr().expectUint(ERR_PARTICIPANT_LIMIT_REACHED);
  }
});

// Project Activation Tests
Clarinet.test({
  name: "Project activation by authorized creator should succeed",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;

    const block = chain.mineBlock([
      // Create project
      Tx.contractCall(
        "ecoweave-project", 
        "create-project", 
        [
          types.utf8("Beach Cleanup"),
          types.utf8("Remove plastic from local beach"),
          types.utf8("Sunset Beach"),
          types.utf8("Coastline"),
          types.uint(10)
        ],
        deployer.address
      ),
      // Activate project
      Tx.contractCall(
        "ecoweave-project", 
        "activate-project", 
        [types.uint(0)],
        deployer.address
      )
    ]);

    // Activation should succeed
    block.receipts[1].result.expectOk();

    // Verify project status
    const projectDetails = chain.callReadOnlyFn(
      "ecoweave-project", 
      "get-project-details", 
      [types.uint(0)], 
      deployer.address
    );

    projectDetails.result.expectSome();
    const project = projectDetails.result.expectSome();
    assertEquals(project.status, PROJECT_STATUS_ACTIVE);
  }
});

Clarinet.test({
  name: "Project activation by unauthorized user should fail",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const unauthorized = accounts.get("wallet_1")!;

    const block = chain.mineBlock([
      // Create project
      Tx.contractCall(
        "ecoweave-project", 
        "create-project", 
        [
          types.utf8("Beach Cleanup"),
          types.utf8("Remove plastic from local beach"),
          types.utf8("Sunset Beach"),
          types.utf8("Coastline"),
          types.uint(10)
        ],
        deployer.address
      ),
      // Attempt activation by unauthorized user
      Tx.contractCall(
        "ecoweave-project", 
        "activate-project", 
        [types.uint(0)],
        unauthorized.address
      )
    ]);

    // Activation should fail
    block.receipts[1].result.expectErr().expectUint(ERR_UNAUTHORIZED);
  }
});

// Check-in and Voting Tests
Clarinet.test({
  name: "Participant check-in and project completion voting",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const participants = [
      accounts.get("wallet_1")!, 
      accounts.get("wallet_2")!, 
      accounts.get("wallet_3")!
    ];

    const block = chain.mineBlock([
      // Create project
      Tx.contractCall(
        "ecoweave-project", 
        "create-project", 
        [
          types.utf8("Beach Cleanup"),
          types.utf8("Remove plastic from local beach"),
          types.utf8("Sunset Beach"),
          types.utf8("Coastline"),
          types.uint(3)
        ],
        deployer.address
      ),
      // Activate project
      Tx.contractCall(
        "ecoweave-project", 
        "activate-project", 
        [types.uint(0)],
        deployer.address
      ),
      // Register participants
      Tx.contractCall(
        "ecoweave-project", 
        "register-for-project", 
        [types.uint(0)],
        participants[0].address
      ),
      Tx.contractCall(
        "ecoweave-project", 
        "register-for-project", 
        [types.uint(0)],
        participants[1].address
      ),
      Tx.contractCall(
        "ecoweave-project", 
        "register-for-project", 
        [types.uint(0)],
        participants[2].address
      ),
      // Check-in participants
      Tx.contractCall(
        "ecoweave-project", 
        "check-in", 
        [types.uint(0)],
        participants[0].address
      ),
      Tx.contractCall(
        "ecoweave-project", 
        "check-in", 
        [types.uint(0)],
        participants[1].address
      ),
      Tx.contractCall(
        "ecoweave-project", 
        "check-in", 
        [types.uint(0)],
        participants[2].address
      ),
      // Vote for project completion
      Tx.contractCall(
        "ecoweave-project", 
        "vote-project-completion", 
        [types.uint(0)],
        participants[0].address
      ),
      Tx.contractCall(
        "ecoweave-project", 
        "vote-project-completion", 
        [types.uint(0)],
        participants[1].address
      ),
      Tx.contractCall(
        "ecoweave-project", 
        "vote-project-completion", 
        [types.uint(0)],
        participants[2].address
      )
    ]);

    // Voting should succeed for all participants
    block.receipts[8].result.expectOk();
    block.receipts[9].result.expectOk();
    block.receipts[10].result.expectOk();

    // Verify project completion
    const projectDetails = chain.callReadOnlyFn(
      "ecoweave-project", 
      "get-project-details", 
      [types.uint(0)], 
      deployer.address
    );

    projectDetails.result.expectSome();
    const project = projectDetails.result.expectSome();
    assertEquals(project.status, PROJECT_STATUS_COMPLETED);
  }
});

// Additional Edge Case and Security Tests
Clarinet.test({
  name: "Voting for project completion without check-in should fail",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const participant = accounts.get("wallet_1")!;

    const block = chain.mineBlock([
      // Create and activate project
      Tx.contractCall(
        "ecoweave-project", 
        "create-project", 
        [
          types.utf8("Beach Cleanup"),
          types.utf8("Remove plastic from local beach"),
          types.utf8("Sunset Beach"),
          types.utf8("Coastline"),
          types.uint(3)
        ],
        deployer.address
      ),
      Tx.contractCall(
        "ecoweave-project", 
        "activate-project", 
        [types.uint(0)],
        deployer.address
      ),
      // Register participant without check-in
      Tx.contractCall(
        "ecoweave-project", 
        "register-for-project", 
        [types.uint(0)],
        participant.address
      ),
      // Try to vote without checking in
      Tx.contractCall(
        "ecoweave-project", 
        "vote-project-completion", 
        [types.uint(0)],
        participant.address
      )
    ]);

    // Voting without check-in should fail
    block.receipts[3].result.expectErr().expectUint(ERR_UNAUTHORIZED);
  }
});

// Error Handling and Authorization Tests
Clarinet.test({
  name: "Attempting to register for non-existent project should fail",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const participant = accounts.get("wallet_1")!;

    const block = chain.mineBlock([
      // Try to register for non-existent project
      Tx.contractCall(
        "ecoweave-project", 
        "register-for-project", 
        [types.uint(999)],  // Non-existent project ID
        participant.address
      )
    ]);

    // Registration should fail with project not found error
    block.receipts[0].result.expectErr().expectUint(ERR_PROJECT_NOT_FOUND);
  }
});

Clarinet.test({
  name: "Attempting to register for inactive project should fail",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const participant = accounts.get("wallet_1")!;

    const block = chain.mineBlock([
      // Create project (but do not activate)
      Tx.contractCall(
        "ecoweave-project", 
        "create-project", 
        [
          types.utf8("Beach Cleanup"),
          types.utf8("Remove plastic from local beach"),
          types.utf8("Sunset Beach"),
          types.utf8("Coastline"),
          types.uint(3)
        ],
        deployer.address
      ),
      // Try to register for inactive project
      Tx.contractCall(
        "ecoweave-project", 
        "register-for-project", 
        [types.uint(0)],
        participant.address
      )
    ]);

    // Registration should fail with project not active error
    block.receipts[1].result.expectErr().expectUint(ERR_PROJECT_NOT_ACTIVE);
  }
});