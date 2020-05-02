# ExpensesSharingAPI

This is the implementation of the expense sharing API which enables a user to share money expenses with other users. The APIs included are as:
* User registration
* User login
* View self profile by logged in user
* Get users by their UUIDs with all the expenses they have added (by logged in user).
* Get a list of all registered users (by logged in user).
* Add a shared expense, which can be shared among 2 or more registered users with split ratio associated to each of them.
* Get the expense details by their UUIDs (by logged in user).
* Get all expenses added by all users (by logged in user).
* Get total balance (overall money to be paid and received by the logged in user).
* Get total summary  of the money the logged in user owes or is owed user wise.
* Pay debt against an added expense by expense UUID.
* Pay debt against a user directly by user UUID.

This API is implemented in node (v12.16.3) and expess (v4.17.1).

Here is the [Postman Collection](https://www.getpostman.com/collections/c03418cec67afd77389b)
 for this project
## Installation

### Notes
* Prior to installation, it's necessary to create a .env file in the root directory of the project and add the keys with their proper values to it from the demo .env.dev file included in the repository.
* Use Mysql server as the backend database.
* Create a user with password and a database in the Mysql server. Pass the same values in the .env file to run the project properly.


Use the package manager [npm]() to install the dependencies.

```bash
npm install
```

## Usage
To run the project, use the npm script

```bash
npm run start
```


Or you can run the project in dev mode which will restart the server upon code changes. To run in dev mode, use the npm script

```bash
npm run dev
```
