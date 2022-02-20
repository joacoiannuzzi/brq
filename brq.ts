import { generateHooks } from "./brq-lib";

const queries = {
  getUser: async () => {
    const res = await fetch(`https://jsonplaceholder.typicode.com/users/${1}`);
    return (await res.json()) as { name: string };
  },
  getPosts: async ({ userId }: { userId: string }) => {
    const res = await fetch(
      `https://jsonplaceholder.typicode.com/posts?userId=${userId}`
    );
    return (await res.json()) as { title: string }[];
  },
};

const mutations = {
  updateUser: async () => {
    const newUser = { name: "new name" };
    return newUser;
  },
  updatePosts: async ({ userId }: { userId: string }) => {
    const newPosts = [{ title: "new title" }];
    return newPosts;
  },
};

export const { queryKeys, useQuery, useMutation } = generateHooks({
  queries,
  mutations,
});
