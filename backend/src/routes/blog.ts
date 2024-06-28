import {PrismaClient} from "@prisma/client/edge";
import {withAccelerate} from "@prisma/extension-accelerate";
import {Hono} from "hono";
import {verify} from "hono/jwt";
import {createBlogInput, updateBlogInput} from "@adityadewhy/medium-zod";

export const blogRouter = new Hono<{
	Bindings: {
		DATABASE_URL: string;
		JWT_SECRET: string;
	};
	Variables: {
		userId: string;
	};
}>();

blogRouter.use("/*", async (c, next) => {
	const authHeader = c.req.header("authorization") || "";
	try {
		const user = await verify(authHeader, c.env.JWT_SECRET);
		if (user) {
			//@ts-ignore
			c.set("userId", user.id); //ts error here at set
			await next();
		} else {
			c.status(403);
			return c.json({
				message: "You are not logged in",
			});
		}
	} catch (e) {
		c.status(403);
		return c.json({
			message: "You are not logged in",
		});
	}
});

blogRouter.post("/create", async (c) => {
	const prisma = new PrismaClient({
		datasourceUrl: c.env.DATABASE_URL,
	}).$extends(withAccelerate());

	const body = await c.req.json();
	const authorId = c.get("userId");
	const {success} = createBlogInput.safeParse(body);
	if (!success) {
		c.status(411);
		return c.text("invalid blog create by zod");
	}

	try {
		const blog = await prisma.blog.create({
			data: {
				title: body.title,
				content: body.content,
				authorId: parseInt(authorId), //ts error here at authorId
				// try authorId: Number(authorId)
			},
		});

		return c.json({
			id: blog.id,
		});
	} catch {
		return c.text("couldnt create blog");
	}
});

blogRouter.put("/update", async (c) => {
	const prisma = new PrismaClient({
		datasourceUrl: c.env.DATABASE_URL,
	}).$extends(withAccelerate());

	const body = await c.req.json();
	const {success} = updateBlogInput.safeParse(body);
	if (!success) {
		c.status(411);
		c.text("invalid blog create by zod");
	}

	try {
		const blog = await prisma.blog.update({
			where: {
				id: body.id,
			},
			data: {
				title: body.title,
				content: body.content,
			},
		});
		return c.json({
			id: blog.id,
		});
	} catch {}
});

blogRouter.get("/bulk", async (c) => {
	const prisma = new PrismaClient({
		datasourceUrl: c.env.DATABASE_URL,
	}).$extends(withAccelerate());
	try {
		const blogs = await prisma.blog.findMany({
			select: {
				content: true,
				title: true,
				id: true,
				author: {
					select: {
						name: true,
					},
				},
			},
		});

		return c.json({
			blogs,
		});
	} catch {
		c.status(411);
		return c.text("couldnt return by zod");
	}
});

blogRouter.get("/:id", async (c) => {
	const prisma = new PrismaClient({
		datasourceUrl: c.env.DATABASE_URL,
	}).$extends(withAccelerate());

	const id = c.req.param("id");

	try {
		const blog = await prisma.blog.findFirst({
			where: {
				id: parseInt(id),
			},
			select: {
				id: true,
				title: true,
				content: true,
				author: {
					select: {
						name: true,
					},
				},
			},
		});
		return c.json({
			blog,
		});
	} catch (error) {
		c.status(411);
		return c.text("couldnt get blog");
	}
});
