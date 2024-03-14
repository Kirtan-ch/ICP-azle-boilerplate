// Import necessary libraries
import { v4 as uuidv4 } from 'uuid';
import { Server, StableBTreeMap, ic } from 'azle';
import express from 'express';

/**
 * `postsStorage` - it's a key-value data structure that is used to store posts.
 * We are using StableBTreeMap for its durability across canister upgrades.
 * The key of the map is the post ID, and the value is the post content.
 */
const postsStorage = StableBTreeMap<string, Post>(0);

/**
 * This type represents a post that can be listed on the platform.
 */
class Post {
   id: string;
   title: string;
   body: string;
   author: string;
   createdAt: Date;
   updatedAt: Date | null;
}

export default Server(() => {
   const app = express();
   app.use(express.json());

   // Endpoint to create a new post
   app.post("/posts", (req, res) => {
      // Extract post details from request body
      const post: Post = { id: uuidv4(), createdAt: getCurrentDate(), ...req.body };
      // Store the post in the postsStorage
      postsStorage.insert(post.id, post);
      // Send back the created post as response
      res.json(post);
   });

   // Endpoint to retrieve all posts
   app.get("/posts", (req, res) => {
      // Retrieve all posts from storage and send them as response
      res.json(postsStorage.values());
   });

   // Endpoint to retrieve a specific post by ID
   app.get("/posts/:id", (req, res) => {
      // Extract post ID from request parameters
      const postId = req.params.id;
      // Retrieve the post from storage by ID
      const postOpt = postsStorage.get(postId);
      // Check if post exists
      if ("None" in postOpt) {
         res.status(404).send(`Post with id=${postId} not found`);
      } else {
         // Send back the retrieved post as response
         res.json(postOpt.Some);
      }
   });

   // Endpoint to update a specific post by ID
   app.put("/posts/:id", (req, res) => {
      // Extract post ID from request parameters
      const postId = req.params.id;
      // Retrieve the post from storage by ID
      const postOpt = postsStorage.get(postId);
      // Check if post exists
      if ("None" in postOpt) {
         res.status(400).send(`Couldn't update post with id=${postId}. Post not found`);
      } else {
         // Update the post with the new data from request body
         const post = postOpt.Some;
         const updatedPost = { ...post, ...req.body, updatedAt: getCurrentDate() };
         // Store the updated post in the storage
         postsStorage.insert(post.id, updatedPost);
         // Send back the updated post as response
         res.json(updatedPost);
      }
   });

   // Endpoint to delete a specific post by ID
   app.delete("/posts/:id", (req, res) => {
      // Extract post ID from request parameters
      const postId = req.params.id;
      // Remove the post from storage by ID
      const deletedPost = postsStorage.remove(postId);
      // Check if post exists
      if ("None" in deletedPost) {
         res.status(400).send(`Couldn't delete post with id=${postId}. Post not found`);
      } else {
         // Send back the deleted post as response
         res.json(deletedPost.Some);
      }
   });

   // Start the Express server
   return app.listen();
});

// Function to get the current date
function getCurrentDate() {
   const timestamp = new Number(ic.time());
   return new Date(timestamp.valueOf() / 1000_000);
}
