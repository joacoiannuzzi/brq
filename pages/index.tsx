import type { NextPage } from "next";
import { useMutation, useQuery } from "../brq";

const Home: NextPage = () => {
  const [posts] = useQuery.getPosts({ userId: "1" });
  const [user] = useQuery.getUser();
  const [updateUser] = useMutation.updateUser({
    invalidateQueries: (invalidations) => {
      invalidations.getPosts({ userId: "1" });
      invalidations.getUser();
    },
  });
  const [updatePosts] = useMutation.updatePosts();

  console.log({
    posts,
    user,
  });

  return (
    <div>
      <button
        onClick={async () => {
          const a = await updateUser();
          console.log(a);
          const b = await updatePosts({ userId: "1" });
          console.log(b);
        }}
      >
        mutate
      </button>
    </div>
  );
};

export default Home;
