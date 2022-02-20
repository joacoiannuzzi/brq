import type { NextPage } from "next";
import { useRestMutation, useRestQuery } from "../brq";

const Home: NextPage = () => {
  const [posts] = useRestQuery.getPosts({ userId: "1" });
  const [user] = useRestQuery.getUser();
  const [mutate] = useRestMutation(async () => ({ id: 1 }), {
    invalidateQueries: (invalidations) => {
      invalidations.getUser();
      invalidations.getPosts({ userId: "1" });
    },
  });
  return (
    <div>
      <button
        onClick={async () => {
          const a = await mutate();
          console.log(a);
        }}
      >
        mutate
      </button>
    </div>
  );
};

export default Home;
