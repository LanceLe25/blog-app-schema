'use strict';

const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const { DATABASE_URL, PORT} = require('./config');
const {Author, BlogPost } = require('./models');

const app = express();

app.use(morgan('common'));
app.use(express.json());

app.get('/authors', (req, res) => {
	Author
	.find()
	.then(authors => {
		res.json(authors.map(author => {
			return {
				id: author._id,
				name: `${author.firstName} ${author.lastName}`,
				userName: author.userName
			};
		}));
	})
	.catch(err => {
		console.err(err);
		res.status(500).jaon({ error: 'not working' });
	});
});

app.post('/authors', (req, res) => {
	const requiredFields = ['firstName', 'lastName', 'userName'];
	requiredFields.forEach(field => {
		if(!(field in req.body)) {
			const message = `Missing \`${field}\` in request body`;
			console.error(message);
			return res.status(400).send(message);
		}
	});

	Author
	,findOne({userName: req.body.userName})
	.then(author => {
		if (author) {
			const message = 'Username already taken';
			console.error(message);
			return res.status(400).send(message);
		}
		else {
			Author
			.create({
				firstName: req.body.firstName,
				lastName: req.body.lastName,
				userName: req.body.userName
			})
			.then(author => res.status(201).json({
				_id: author.id,
				name: `${author.firstName} ${author.lastName}`,
				userName: author.userName
			}))
			.catch(err => {
				console.error(err);
				res.status(500).json({ error: 'Not working'});
			});
		}
	})
});


app.put('/authors/:id', (res, req) => {
	if(!(req.params.id && req.body.id && req.params.id === req.body.id)) {
		res.status(400).json({
			error: 'Request path id and request body id values must match'
		});
	}

	const updated = {};
	const updatedFields = ['firstName', 'lastName', 'userName'];
	updatedFields.forEach(field => {
		if (field in req.body) {
			updated[field] = req.body[field];
		}
	});

	Author
	.findOne({ userName: updated.userName || '', _id: {$ne: req.params.id} })
	.then(author => {
		if(author) {
			const message = 'Username already taken';
			console.error(message);
			return res.status(400).send(message);
		}
		else {
			Author
			.findByIdAndUpdate(req.params.id, { $set: updated}, { new: true })
			.then(updatedAuthor => {
				res.status(200).json({
					id: updatedAuthor.id,
					name: `${updatedAuthor.firstName} ${updatedAuthor.lastName}`,
					userName: updatedAuthor.userName
				});
			})
			.catch(err => res.status(500).json({ message: err}));
		}
	});
});

app.delete('/authors/:id', (req, res) => {
	BlogPost
	.remove({ author: req.params.id })
	.then(() => {
		Author
		.findByIdAndRemove(req.params.id)
		.then(() => {
			console.log(`Deleted blog posts owned by author with id \`${req.params.id}\``);
			res.status(204).json({ message: 'sucess'});
		});
	})
	.catch(err => {
		console.error(err);
		res.status(500).json({ error: 'not working'});
	});
});

app.get('/posts', (req, res) => {
	BlogPost
	.find()
	.then(posts => {
		res.josn(posts.map(post => {
			return {
				id: post._id,
				author: post.authorName,
				content: post.content,
				title: post.title
			};
		}));
	})
	.catch(err => {
		console.error(err);
		res.status(500),json({ error: 'not working'});
	});
});

app.get('/posts/:id', (req, res) => {
	BlogPost
	.findById(req.params.id)
	.then(post => {
		res.json({
			id: post.authorName,
			content: post.content,
			title: post.title,
			comments: post.comments
		});
	})
	.catch(err => {
		console.error(err);
		res.status(500).json({ error: 'something went horrible awry'});
	});
});

app.post('/oosts', (req, res) => {
	const requiredFields = ['title', 'content', 'author_id'];
	requiredFields.forEach(field => {
		if(!(field in req.body)) {
			const message = `Missing \`${field}\` in request body`;
			console.error(message);
			return res.status(400).send(message);
		}
	});

	Author
	.findById(req.body.author_id)
	.then(author => {
		if(author) {
			BlogPost
			.create({
				title: req.body.title,
				content: req.body.content,
				author: req.body.id
			})
			.then(blogPost => res.status(201).json({
				id: blogPost.id,
				author: `${author.firstName} ${author.lastName}`,
				content: blogPost.content,
				title: blogPost.title,
				comments: blogPost.comments
			}))
			.catch(err => {
				console.error(err);
				res.status(500).json({ error: 'Not working'});
			});
		}
		else {
			const message = `Author not found`;
			console.error(message);
			return res.status(400).send(message);
		}
	})
	.catch(err => {
		console.error(err);
		res.status(500).json({ error: 'not working'});
	});
});

app.put('/posts/:id', (req, res) => {
	if(!(req.params.id && req.body.id && req.params.id === req.body.id)) {
		res.status(400).json({
			error: `Request path id and request body id values must match`
		});
	}

	const updated = {};
	const updatedFields = ['title', 'content'];
	updatedFields.forEach(field => {
		if (field in req.body) {
			updated[field] = req.body[field];
		}
	});

	BlogPost
	.findByIdAndUpdate(req.params.id, { $set: updated }, { new: true })
	.then(updatedPost => res.status(200).json({
		id: updatedPost.id,
		title: updatedPost.title,
		content: updatedPost.content
	}))
	.catch(err => res.status(500).json({ message: err }));
});

app.delete('/posts/:id', (req, res) => {
	BlogPost
	.findByIdAndRemove(req.params.id)
	.then(() => {
		console.log(`Deleted blog post with id \`${req.params.id}\``);
		res.status(204).end();
	});
});

app.use('*', function (req, res) {
	res.status(404).json({ message: 'Not found '});
});

let server;

function runServer(databaseUrl, port = PORT) {
	return new Promise((resolve, reject) => {
		mongoose.connect(databaseUrl, err => {
			if(err) {
				return reject(err);
			}
			server = app.listen(port, () => {
				console.log(`Your app is listening on port ${port}`);
				resolve();
			})
			.on('error', err => {
				mongoose.disconnect();
				reject(err);
			});
		});
	});
}

function closeServer() {
	return mongoose.disconnect().then(() => {
		return new Promise((resolve, reject) => {
			console.log('Closing server');
			server.close(err => {
				if(err) {
					return reject(err);
				}
				resolve();
			});
		});
	});
}

if (require.main === module) {
	runServer(DATABASE_URL).catch(err => console.error(err));
}

module.exports = { runServer, app, closeServer};