# envkit CLI

The envkit CLI is a command-line interface (CLI) for interacting with the envkit API. It provides a set of commands for managing projects, devices, and authentication.
! By default Envkit uses `.env.local` files to store environment variables.

## Folder Structure

apps/cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts             # calls run() from cli.ts
│   ├── cli.ts               # creates new Command(), registers subcommands
│   ├── commands/            # each command exports a Commander Command
│   │   ├── index.ts         # aggregates and registers all commands
│   │   ├── auth/
│   │   │   ├── login.ts
│   │   │   ├── logout.ts
│   │   │   └── status.ts
│   │   ├── project/
│   │   │   ├── create.ts
│   │   │   ├── list.ts
│   │   │   └── delete.ts
│   │   ├── init.ts
│   │   └── audit.ts
│   ├── services/            # pure logic, not tied to Commander
│   │   ├── auth.service.ts
│   │   ├── project.service.ts
│   │   ├── git.service.ts
│   │   ├── env.service.ts
│   │   └── device.service.ts
│   ├── core/                # low-level building blocks
│   │   ├── config.ts
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   └── utils.ts
│   ├── constants/
│   │   ├── paths.ts
│   │   ├── messages.ts
│   │   └── config.ts
│   └── types/
│       ├── cli.ts
│       └── project.ts
└── tests/
    ├── unit/
    └── e2e/

## Command Structure

envkit
  - auth
    - login (alias: auth) # authenticate with envkit
    - logout # log out of the current session
    - whoami # get information about the current user
      - optional flags: --verbose, --json

  - init # initialize envkit in the current directory
  - push <stage> # push variables to the specified stage
  - pull <stage> # pull variables from the specified stage
  - sync [stage] # sync variables from the specified stage
  - set <stage> <key> <value> # set a variable in the specified stage
  - get <stage> <key> # get a variable from the specified stage
  - delete <stage> <key> # delete a variable from the specified stage
  - list / ls # list all stages
  - status # display the status of the current project
  - diff # display the differences between the local and remote states

  - project
    - create [name] # create a new project
    - delete [name] # (alias: rm) delete a project
    - rename <old> <new> # rename a project
    - list # list all user projects
      - optional flags: --json
  - deploy <file> # push variables from specified file to production
  - share # generate a share token for a project, defaults to development stage
  - link # consume a share token to link a project to a remote environment
  - unlink # unlink a project from a remote environment
  - invite <email> [team] # invite a user to a team