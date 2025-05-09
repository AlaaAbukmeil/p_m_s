export interface UserAuth {
  email: string;
  password: string | null;
  access_role_instance: string;
  access_role_portfolio: string | null;
  share_class: string;
  last_time_accessed: string;
  reset_password: boolean | null;
  created_on: string;
  type: "user" | "link";
  investor_id_mufg: string | null;
  name: string | null;
  link: string | null;
  expiration: string | null;
  token: string | null;
  id: string;
  reset_code: string | null;
  files:
    | {
        name: string;
        link: string;
        purpose: string;
        createdOn: string;
      }[]
    | null;
  route: string | null;
}
