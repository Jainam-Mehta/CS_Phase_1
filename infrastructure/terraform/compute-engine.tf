# Compute Engine VM with Self-Managed PostgreSQL
# Cost: ~$36/month (e2-medium in asia-south1)

resource "google_compute_instance" "coldsense_vm" {
  name         = "coldsense-production-vm"
  machine_type = "e2-medium"  # 2 vCPU, 4GB RAM
  zone         = var.zone

  # Boot disk
  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2404-lts-amd64"
      size  = 30  # GB
      type  = "pd-balanced"  # SSD
    }
  }

  # Network interface
  network_interface {
    network = "default"
    access_config {
      # Ephemeral public IP
    }
  }

  # Metadata
  metadata = {
    enable-oslogin = "TRUE"
  }

  # Tags for firewall rules
  tags = ["http-server", "backend-api", "ssh"]

  # Startup script to install Docker
  metadata_startup_script = <<-EOF
    #!/bin/bash
    set -e
    
    # Update system
    apt-get update
    apt-get upgrade -y
    
    # Install Docker
    apt-get install -y ca-certificates curl
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start Docker
    systemctl enable docker
    systemctl start docker
    
    # Create project directory
    mkdir -p /opt/coldsense
    
    echo "Docker installed successfully!" > /opt/coldsense/install.log
  EOF

  # Allow stopping
  allow_stopping_for_update = true

  depends_on = [
    google_project_service.container,
    google_project_service.artifact_registry
  ]
}

# Firewall rule for backend API
resource "google_compute_firewall" "allow_backend" {
  name    = "allow-backend-api"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["8000"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["backend-api"]
}

# Firewall rule for HTTP/HTTPS
resource "google_compute_firewall" "allow_http" {
  name    = "allow-http-https"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["http-server"]
}

# Output VM details
output "vm_external_ip" {
  value       = google_compute_instance.coldsense_vm.network_interface[0].access_config[0].nat_ip
  description = "External IP of the VM"
}

output "vm_name" {
  value       = google_compute_instance.coldsense_vm.name
  description = "Name of the VM"
}

output "vm_zone" {
  value       = google_compute_instance.coldsense_vm.zone
  description = "Zone of the VM"
}

output "ssh_command" {
  value       = "gcloud compute ssh ${google_compute_instance.coldsense_vm.name} --zone=${var.zone} --project=${var.project_id}"
  description = "SSH command to connect to VM"
}
