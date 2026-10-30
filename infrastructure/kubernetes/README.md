# Kubernetes (optional)

A Kustomize base for running on a cluster with an external PostgreSQL.

```bash
cp secret.env.example secret.env        # fill in DATABASE_URL, EMACHINE_API_TOKEN, AUTH_TOKENS
kubectl create namespace stockham-tags
kubectl -n stockham-tags create secret generic stockham-tags --from-env-file=secret.env
kubectl apply -k .
```

- An init container runs migrations once per rollout, so API pods start with `RUN_MIGRATIONS=false`.
- Attachments live on a `ReadWriteMany` volume shared by the API replicas.
- `backup-cronjob.yaml` runs `apexapp.database.backup create` nightly.
- Change the image names in `kustomization.yaml` and the host in `ingress.yaml` and `configmap.yaml`.
