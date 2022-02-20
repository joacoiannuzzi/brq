import { generateRestQueryClient } from "./brq-lib";

export const { queryKeys, useRestQuery, useRestMutation } =
  generateRestQueryClient({
    getUser: async () => {
      const res = await fetch(
        `https://jsonplaceholder.typicode.com/users/${1}`
      );
      return (await res.json()) as { name: string };
    },

    getPosts: async ({ userId }: { userId: string }) => {
      const res = await fetch(
        `https://jsonplaceholder.typicode.com/posts?userId=${userId}`
      );
      return (await res.json()) as { title: string }[];
    },
  });
