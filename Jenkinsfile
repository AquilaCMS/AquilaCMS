pipeline {
    agent { label 'JDK-17-MVN-3.6' }
    triggers { pollSCM ('* * * * *') }
    parameters {
        choice(name: 'MAVEN_GOAL', choices: ['package', 'install', 'clean'], description: 'Maven Goal')
    }
    stages {
        stage('vcs') {
            steps {
                git url: 'https://github.com/satya36-cpu/AquilaCMS.git',
                    branch: 'master'
            }
        }
        stage('build') { 
            steps {
                sh "mvn ${params.MAVEN_GOAL}"
				}
                
                
        }
        
        stage('post build') {
            steps {
                junit testResults: '**/surefire-reports/TEST-*.xml'
            }
        }
    }
}        