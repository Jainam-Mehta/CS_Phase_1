resource "google_project_service" "container" {
  project = var.project_id
  service = "container.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "artifact_registry" {
  project = var.project_id
  service = "artifactregistry.googleapis.com"

  disable_on_destroy = false
}

resource "google_container_cluster" "coldsense" {
  name     = var.cluster_name
  location = var.region

  enable_autopilot = true

  deletion_protection = false

  networking_mode = "VPC_NATIVE"

  depends_on = [
    google_project_service.container,
    google_project_service.artifact_registry
  ]
}