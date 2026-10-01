# Blog Platform with Comments

Express + **MongoDB** (Mongoose) + JWT auth. Vanilla JS frontend.

## Features
- Register / login (bcrypt + JWT)
- Create, edit, delete blog posts (only the author can edit/delete)
- Comment on any post when logged in
- Comment author or post author can delete a comment
- REST API, responsive layout

## 1. Database setup (choose one)

**Option A - MongoDB Atlas (cloud, free, no install)**
1. Create an account at mongodb.com/atlas and create a free M0 cluster.
2. Database Access -> Add user (username + password).
3. Network Access -> Add IP Address -> Allow access from anywhere (0.0.0.0/0).
4. Connect -> Drivers -> copy the connection string.
5. Put it in `.env` as `MONGO_URI`, adding the database name before `?`, e.g.
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/blog?retryWrites=true&w=majority`

**Option B - Local MongoDB**
Install MongoDB Community Server. The default `mongodb://127.0.0.1:27017/blog` works as is.

## 2. Run
```
copy .env.example .env      (Windows)   |   cp .env.example .env   (Mac/Linux)
npm install
npm start
```
Open http://localhost:3000

## API
| Method | Endpoint | Access |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | public |
| GET | /api/auth/me | logged in |
| GET | /api/posts, /api/posts/:id | public |
| POST | /api/posts | logged in |
| PUT / DELETE | /api/posts/:id | post author |
| GET | /api/posts/:id/comments | public |
| POST | /api/posts/:id/comments | logged in |
| DELETE | /api/comments/:id | comment author or post author |

Send token as `Authorization: Bearer <token>`.
