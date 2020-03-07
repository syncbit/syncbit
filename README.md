# SyncTune
A music synchronization web application.

## Development

The development environment has been containerized using Docker and Docker-Compose. This allows for a streamlined environment setup and configuration (no going around starting up 3+ different servers).

To start the development environment, simply type the following command

```
npm run start:dev
```

### NPM Scripts

Below are some useful NPM scripts for development

#### Environments
* `dev`: the development environment

#### Services
* `reverse-proxy`: the reverse-proxy container using Nginx
* `client`: the Vue frontend SPA container
* `signalling-server`: the Node JS signalling server container

#### Commands
* `start:[environment]`: starts up the given environment
* `rm-services:[environment]--[?service]`: removes given services from Docker. if no specific service is provided then all are removed
* `restart:[environment]--[?service]`: hot restarts the given service. If no specific service is specified then all are restarted
* `shell:[service]`: opens an interactive shell into the given running service container