redis-cli # then FLUSHALL

sudo nano /etc/caddy/Caddyfile
sudo systemctl restart caddy

cd ~/ev-routing
rm output.log && \
rm errors.log && \
rm results.db* && \
rm -rf build/ && \
rm -rf .svelte-kit/ && \
git stash

cd ~/ev-routing/osrmdata
rm *
wget http://download.geofabrik.de/europe/sweden-latest.osm.pbf
sudo docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/sweden-latest.osm.pbf || "osrm-extract failed"
sudo docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/sweden-latest.osrm || "osrm-partition failed"
sudo docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/sweden-latest.osrm || "osrm-customize failed"
sudo chown mattlehrer:mattlehrer *

git pull
pnpm i
pnpm build

tmux new -s experiment
NODE_OPTIONS="--max-old-space-size=30720" pm2 start build/index.js -o output.log -e errors.log --time
sudo docker restart datasette
sudo crontab -e
pm2 monit