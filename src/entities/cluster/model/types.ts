export interface Cluster {
    id: string;
    name: string;
    created_at: string;
    cluster_accounts?: { account_id: string }[];
}

export interface ClusterAccount {
    cluster_id: string;
    account_id: string;
}
