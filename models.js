'use strict';

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const authorSchema = mongoose.Schema({
	firstName: String,
	lastName: String,
	userName: {
		type: String,
		unique: true
	}
});

let commentSchema = mongoose.Schema({content: 'string'});

let blogPostSchema = mongoose.Schema({
	title: 'string',
	content: 'string',
	author: {type: mongoose.Schema.Types.ObjectId, ref: 'Author'},
	comments: [commentSchema]
});

blogPostSchema.pre('find', function(next) {
	this.populate('author');
	next();
});

blogPostSchema.pre('findOne', function(next) {
	this.populate('author');
	next();
});

blogPostSchema.virtual('authorName').get(function() {
	return `${this.author.firstName} ${this.author.lastName}`.trim();
});

blogPostSchema.methods.serialize = function() {
	return {
		id: this._id,
		author: this.authorName,
		content: this.content,
		title: this.title,
		comments: this.comments
	};
};

let Author = mongoose.model('Author', authorSchema);
const BlogPost = mongoose.model('BlogPost', blogPostSchema);

module.exports = {Author, BlogPost};

