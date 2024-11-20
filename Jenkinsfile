pipeline {
    agent { label 'JDK-17-MVN-3.6.3' }

    tools {
        // Install the Maven version configured as "M3" and add it to the path.
        maven "mvn-3.6.3"
    }

    stages {
        stage('Build') {
            steps {
                // Get some code from a GitHub repository
                git 'https://github.com/satya36-cpu/AquilaCMS.git'

                // Run Maven on a Unix agent.
                sh "mvn -Dmaven.test.failure.ignore=true clean package"

                // To run Maven on a Windows agent, use
                // bat "mvn -Dmaven.test.failure.ignore=true clean package"
            }
        } 
        stage('docker image build & push') {
            steps {
                sh 'docker image build -t satyabrata36/aquila:1.0 .'
                sh 'docker image push satyabrata36/aquila:1.0'
            }
        }
        stage('deploy on k8s') {
		    agent { label 'JDK-17' }
			steps {
			    sh 'kubectl apply -f deployment.yaml'
				sh 'kubectl apply -f service.yaml'
			}
		}
    }
}           
        

            
        
    
    


