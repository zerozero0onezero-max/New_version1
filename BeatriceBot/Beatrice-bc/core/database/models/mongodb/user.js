const mongoose = require("mongoose");
const { Schema } = mongoose;

const userModel = new Schema({
        userID: {
                type: String,
                unique: true
        },
        username: {
                type: String,
                default: null
        },
        name: String,
        gender: Number,
        vanity: String,
        exp: {
                type: Number,
                default: 0
        },
        money: {
                type: Number,
                default: 0
        },
        diamond: {
                type: Number,
                default: 0
        },
        banned: {
                type: Object,
                default: {}
        },
        settings: {
                type: Object,
                default: {}
        },
        data: {
                type: Object,
                default: {}
        }
}, {
        timestamps: true,
        minimize: false
});

userModel.index({ username: 1 }, { sparse: true });

module.exports = mongoose.model("users", userModel);