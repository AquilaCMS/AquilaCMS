echo "=== Add modules packages script ==="

current_folder=$(ls ./ | grep "scripts")
if [[ $current_folder = "scripts/" ]]; then
        pwd
else
        cd ../
        pwd
fi

echo -e "\n"

themes_string=$(ls themes)
echo "List of all themes :"
echo $themes_string
echo -e "\n"
mapfile -t themes_array <<< "$themes_string"

read -p "Type the name of a theme : " theme_choice
selected_theme=($theme_choice)

list_modules_site=$(ls ./modules/ | grep -v ".zip")
mapfile -t modules_site_array <<< "$list_modules_site"
for k in "${modules_site_array[@]}"
do
        echo "### Add packages of : ###"
        echo $k
        echo -e "\n"

        ### Add api packages ###
        module_api_packages=$(awk '/api/{flag=1;next}/]/{flag=0}flag' ./modules/$k/info.json)
        if [ ! -z "$module_api_packages" ]; then
                module_api_packages=${module_api_packages//"\""/}
                module_api_packages=${module_api_packages//","/}
                mapfile -t module_api_packages_array <<< "$module_api_packages"

                echo "## Add api packages ##"
                echo -e "\n"
                for l in "${module_api_packages_array[@]}"
                do
                        echo "# Add package : #"
                        echo $l
                        yarn add $l
                        echo -e "\n"
                done
        fi

        ### Add theme packages ###
        module_theme_packages=$(awk '/theme/{flag=1;next}/]/{flag=0}flag' ./modules/$k/info.json)
        if [ ! -z "$module_theme_packages" ]; then
                module_theme_packages=${module_theme_packages//"\""/}
                module_theme_packages=${module_theme_packages//","/}
                mapfile -t module_theme_packages_array <<< "$module_theme_packages"
                cd ./themes/$selected_theme/
                echo -e "\n"
                echo "We are here :"
                pwd
                echo -e "\n"

                echo "## Add theme packages ##"
                echo -e "\n"
                for m in "${module_theme_packages_array[@]}"
                do
                        echo "# Add package : #"
                        echo $m
                        yarn add $m
                        echo -e "\n"
                done

                cd ../../
                echo "We are here :"
                pwd
                echo -e "\n"
        fi
        echo -e "------------------------------------------------"
        echo -e "\n"
done
echo "### Script done ! ###"
