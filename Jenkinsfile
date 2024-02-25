pipeline {

    agent {
        kubernetes {
            yamlFile 'kubernetesPod.yaml'
            defaultContainer 'kaniko'
        }
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '3'))
    }

    stages {
        stage('Prepare environment') {
            steps {
                script {
                    def packageJson = readJSON(text: readFile("./package.json").trim())
                    env.ARTIFACT_ID = packageJson.name
                    env.VERSION = packageJson.version
                    env.REPO = "openanalytics/${env.ARTIFACT_ID}"
                    env.REGISTRY = "registry.openanalytics.eu"
                    env.TAG = "${env.VERSION}"
                }
            }
        }

        stage('Build Docker App image') {
            steps {
                container('kaniko'){
                    sh """
                    /kaniko/executor \
                            -v info \
                            --context ${env.WORKSPACE} \
                            --cache=true \
                            --cache-repo ${env.REGISTRY}/${env.REPO} \
                            --destination ${env.REGISTRY}/${env.REPO}:${env.TAG} \
                            --dockerfile Dockerfile.app
                    """
                }
            }
        }

        stage('Build Docker Liquibase image') {
            steps {
                container('kaniko'){
                    sh """
                    /kaniko/executor \
                            -v info \
                            --context ${env.WORKSPACE} \
                            --cache=true \
                            --cache-repo ${env.REGISTRY}/${env.REPO}.liquibase \
                            --destination ${env.REGISTRY}/${env.REPO}.liquibase:${env.TAG} \
                            --dockerfile Dockerfile.db
                    """
                }
            }
        }
    }
}
