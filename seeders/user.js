const { faker } = require("@faker-js/faker");
const User = require("../models/User");

const createUser = async (numUsers) => {
    try {
        const usersPromise = [];
        for (let i = 0; i < numUsers; i++) {
            const tempUSer = User.create({
                name: faker.person.fullName(),
                username: faker.internet.userName(),
                bio: faker.lorem.sentence(10),
                password: "password",
                avatar: {
                    url: faker.image.avatar(),
                    public_id: faker.system.fileName()
                }
            });
            usersPromise.push(tempUSer);
        }
        await Promise.all(usersPromise);
        console.log("Users created", numUsers);
        process.exit(1);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};
module.exports = { createUser };