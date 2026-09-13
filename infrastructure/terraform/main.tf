# ColdSense Infrastructure - Compute Engine with Self-Managed PostgreSQL
# Cost: ~$36/month for e2-medium VM

# Enable required APIs
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

resource "google_project_service" "compute" {
  project = var.project_id
  service = "compute.googleapis.com"

  disable_on_destroy = false
}

# Artifact Registry for Docker images
resource "google_artifact_registry_repository" "coldsense_repo" {
  location      = var.region
  repository_id = "coldsense-repo"
  description   = "ColdSense Docker images"
  format        = "DOCKER"

  depends_on = [google_project_service.artifact_registry]
}
