# EcoWeave - Decentralized Community Cleanup Platform

EcoWeave is a decentralized platform for organizing and tracking community environmental clean-up projects using Clarity smart contracts on the Stacks blockchain.

## Project Overview

EcoWeave provides a decentralized solution for communities to plan, manage, and track their environmental clean-up efforts. The platform allows community members to propose, join, and participate in clean-up projects, ensuring transparency and accountability throughout the process.

Key features of the EcoWeave platform include:

- Project creation and activation
- Participant registration and management
- Project check-in and completion voting
- Verification of participant contributions
- Automated project completion tracking and reporting

## Contract Architecture

The EcoWeave platform is built on a single Clarity smart contract, `ecoweave-project.clar`, which manages the entire lifecycle of community clean-up projects.

### Data Structures

The contract maintains the following key data structures:

1. `projects`: A map that stores the details of each clean-up project, including the name, description, location, target area, creator, participant limits, current participation, status, and completion votes.
2. `project-participants`: A map that tracks the registration status, check-in, and verification of each participant for a given project.
3. `next-project-id`: A data variable that keeps track of the next available project ID.

### Public Functions

The contract provides the following public functions:

1. `create-project`: Allows the creator to define a new clean-up project with the necessary metadata.
2. `register-for-project`: Enables participants to register for an active project, subject to capacity limits.
3. `activate-project`: Allows the project creator to activate a proposed project, making it available for registration.
4. `check-in`: Enables registered participants to check in for a project they are participating in.
5. `vote-project-completion`: Allows checked-in participants to vote for the completion of a project.
6. `get-project-details`: Provides read-only access to the details of a specific project.
7. `get-participant-status`: Allows querying the status of a participant for a given project.

### Security Considerations

The contract includes the following security measures:

1. Input validation: The contract validates the input parameters for all public functions to ensure data integrity.
2. Access control: Only the project creator can activate a project, and only registered and checked-in participants can vote for project completion.
3. Participant registration limits: The contract enforces a maximum number of participants for each project and prevents duplicate registrations.
4. Voting threshold: The contract requires a minimum percentage of participants to verify the project's completion before marking it as completed.

## Usage Guide

### Project Creation

1. Call the `create-project` function, providing the project name, description, location, target area, and maximum number of participants.
2. The new project will be created with a `PROJECT_STATUS_PROPOSED` status.

### Project Activation

1. The project creator can call the `activate-project` function to change the project status to `PROJECT_STATUS_ACTIVE`.
2. Participants can then register for the active project using the `register-for-project` function.

### Participant Registration

1. Participants can call the `register-for-project` function, providing the project ID they want to join.
2. The contract will validate the project status and participant capacity before registering the participant.

### Participant Check-in

1. Registered participants can call the `check-in` function to mark themselves as checked-in for the project.

### Project Completion Voting

1. Checked-in participants can call the `vote-project-completion` function to indicate that the project is completed.
2. The contract will track the completion votes and automatically mark the project as `PROJECT_STATUS_COMPLETED` once the verification threshold is reached.

## Testing

The EcoWeave project includes a comprehensive test suite, `ecoweave-project_test.ts`, which validates the functionality of the contract across various scenarios, including:

- Successful project creation with complete metadata
- Failure of project creation with missing required fields
- Participant registration for an active project
- Prevention of duplicate participant registration
- Failure of participant registration when the project is full
- Successful project activation by the authorized creator
- Failure of project activation by an unauthorized user
- Participant check-in and project completion voting
- Failure of voting without participant check-in
- Failure of registration for non-existent or inactive projects

To run the tests, use the Clarinet tool with the provided `Clarinet.toml` configuration file.

## Security Considerations

The EcoWeave contract includes several security measures to ensure the integrity and reliability of the platform:

1. **Input Validation**: The contract thoroughly validates all input parameters to prevent invalid data from being stored.
2. **Access Control**: The contract enforces strict access controls, allowing only the project creator to activate a project and only registered and checked-in participants to vote for project completion.
3. **Participant Registration Limits**: The contract enforces a maximum number of participants for each project and prevents duplicate registrations.
4. **Voting Threshold**: The contract requires a minimum percentage of participants to verify the project's completion before marking it as completed, ensuring a robust consensus mechanism.

Additionally, it is recommended to conduct regular security audits and bug bounty programs to identify and address any potential vulnerabilities in the EcoWeave contract.
