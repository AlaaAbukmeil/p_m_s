export interface UserAuth {
  email: string;
  password: string | null;
  access_role_factsheet: string;
  access_role_portfolio: string | null;
  share_class: string;
  last_time_accessed: string;
  reset_password: boolean | null;
  created_on: string;
  type: "user" | "link";

  name: string | null;
  link: string | null;
  expiration: string | null;
}
