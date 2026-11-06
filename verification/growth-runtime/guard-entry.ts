import { watchLease } from "./guard";

watchLease().catch(() => {
  process.exitCode = 1;
});
