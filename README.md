
A simple demo to use Express 4 + MySQL 3.2 + NodeJS 6.0
	How to use MySql Docker images
	How to setup MySql connection in Express routers 


Integrate with MySql data model
--------------------------
Module: mysql Installation

	$ npm install mysql

	└─┬ mysql@2.11.1 
	  ├── bignumber.js@2.3.0 
	  ├── readable-stream@1.1.14 
	  └── sqlstring@2.0.1 

Start MySql in docker
-----------------------

In order to let all docker to connect to Docker daemon, I start it -

	$ sudo docker daemon -H 0.0.0.0:2375 &
	$ docker -H :2375 info ---> check docker status
	$ cat /etc/default/docker ---> see how I config auto-start docker daemon 
	                               using "-H tcp://0.0.0.0:2375"

	$ docker -H :2375 images
	REPOSITORY           TAG                 IMAGE ID            CREATED             SIZE
	mongo                latest              7f09d45df511        13 days ago         336.1 MB
	ubuntu               latest              cf62323fa025        2 weeks ago         125 MB
	mysql/mysql-server   5.6                 a0e42803a1e7        3 months ago        303.1 MB

So, need to specify the -H in docker client CML

	$ docker -H :2375 run --name david_mysql -p 3306:3306 -v /home/david/mysql_data:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=12345678 -d mysql/mysql-server:5.6
	docker: Error response from daemon: Conflict. The name "/david_mysql" is already in use by container 63a05fd981dc6a0ec8fabea73dc73f480f5afa4cb0e9cb410bfefcf224a81f41. You have to remove (or rename) that container to be able to reuse that name..
See 'docker run --help'.

	docker -H :2375 rm david_mysql

	$ docker -H :2375 run --name david_mysql -p 3306:3306 -v /home/david/mysql_data:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=12345678 -d mysql/mysql-server:5.6

	63a05fd981dc6a0ec8fabea73dc73f480f5afa4cb0e9cb410bfefcf224a81f41

	david@ubuntu-pc:~/mydockerbuild/MySQL$ docker -H :2375 ps 
	CONTAINER ID        IMAGE                    COMMAND                  CREATED              STATUS              PORTS                    NAMES
	63a05fd981dc        mysql/mysql-server:5.6   "/entrypoint.sh mysql"   About a minute ago   Up About a minute   0.0.0.0:3306->3306/tcp   david_mysql
	david@ubuntu-pc:~/mydockerbuild/MySQL$

	Notes: don't use --rm mysql/mysql-server:5.6
		make sure -H :2375 is before 'run'

Start MySql with custom config file
-----------------------------------

First get container's config file
	docker exec -it my-container-name cat /etc/my.cnf > /my/custom/config-file
Then, map it when start the container
	$ docker -H :2375 run --name david_mysql -p 3306:3306 -v /my/custom/config-file:/etc/my.cnf -e MYSQL_ROOT_PASSWORD=12345678 -d mysql/mysql-server:tag

Another way to cp files between host and docker host
----------------------------------------------------

	Since we start mysql server with -v /home/david/mysql_data:/var/lib/mysql
	To use config file, we can copy it to /home/david/mysql_data first, then copy it to /etc/my.cnf
	To load the data file, we can copy it to /home/david/mysql_data, then copy it to /var/lib/mysql-files
	Use mysql to check the variable value:
	mysql> SHOW VARIABLES LIKE "secure_file_priv";
	+------------------+-----------------------+
	| Variable_name    | Value                 |
	+------------------+-----------------------+
	| secure_file_priv | /var/lib/mysql-files/ |
	+------------------+-----------------------+
	1 row in set (0.00 sec)

Start MySql client To connect to mysql server
---------------------------------------------

	$ docker -H :2375 run -it --link david_mysql:mysql --rm mysql/mysql-server:5.6 sh -c 'exec mysql -h"$MYSQL_PORT_3306_TCP_ADDR" -P"$MYSQL_PORT_3306_TCP_PORT" -uroot -p"$MYSQL_ROOT_PASSWORD"'
	Enter password: .... becz $MYSQL_ROOT_PASSWORD is undefined

		> sql command, e.g.
		> show tables
		> desc restaurant
		> select count(*) from resturant_score

	You don't need --link david_mysql:mysql as I started mysql-server with -p 3306:3306
	You can run local mysql client to connect to docker's mysqld
		$ docker -H :2375 inspect  --> check Networks: "bridge": "IPAddress": x.x.x.x
		$ mysql -h 172.17.0.2 -uroot -p  (key-in password as specify when u start the server) 
		mysql> ....


Create myql user id and grant permission
----------------------------------------

	CREATE USER 'david'@'%' IDENTIFIED BY '12345678';
	GRANT ALL PRIVILEGES ON * . * TO 'david'@'%';
	Then, exit mysql and user new user to login mysql
	mysql -h 172.17.0.2 -udavid -p
	Enter password: 
	Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.
	
	mysql> show databases;
	+--------------------+
	| Database           |
	+--------------------+
	| information_schema |
	| mysql              |
	| performance_schema |
	+--------------------+
	3 rows in set (0.00 sec)


Imported data to Mysql DB 
--------------------------
	1. Prepare data file in /home/david/mysql_data/test_data.dat
		    create database kphdb ;
		    create table restaurants (
		        id      INT NOT NULL AUTO_INCREMENT,
		        address VARCHAR(100),
		        borough VARCHAR(50),
		        cuisine VARCHAR(50),
		        grades VARCHAR(2),
		        name    VARCHAR(100),
		        restaurant_id   INT,
		        PRIMARY KEY(id)
		     ) ;

	2. use mysql to run the load command 
		mysql -e "LOAD DATA INFILE 'mysql_data_file.dat' INTO TABLE restaurants" kphdb
			or
		enter 'mysql' then
		mysql> LOAD DATA INFILE 'mysql_data.dat' INTO TABLE restaurants
		  FIELDS TERMINATED BY ',';

		ERROR 1290 (HY000): The MySQL server is running with the --secure-file-priv option so it cannot execute this statement
		mysql> SHOW VARIABLES LIKE "secure_file_priv";
		+------------------+-----------------------+
		| Variable_name    | Value                 |
		+------------------+-----------------------+
		| secure_file_priv | /var/lib/mysql-files/ |
		+------------------+-----------------------+
		1 row in set (0.00 sec)


		LOAD DATA INFILE '/var/lib/mysql-files/mysql_data_file.dat'
		 INTO TABLE restaurants
		 FIELDS TERMINATED BY ','
		 (address,borough,cuisine,grades,name,restaurant_id)
		 SET id = NULL

		Query OK, 100 rows affected, 18 warnings (0.13 sec)
		Records: 100  Deleted: 0  Skipped: 0  Warnings: 18


Add database connection and query into Express generator model
--------------------------------------------------------------

First of all, nodejs use module.exports... to expose variables

	bin/www --> requires(../app.js) --> 
	--->requires(../routes/index.js, db_ado.js, user.js ....
	--->requires(../views/index.jade, db_ado.jade, layout.jade
	so, in order to open db connection at the server start up, 
	in app.js, add db_ado.db_conn(), it will open database connect 
	Then, the var db will be a global can be used inside db_ado.js context


routes/db_ado.js added
----------------------

	var mysql = require('mysql'); // dhsia added
	var db ;
	
	var db_conn = function() {
	
	   var connection = mysql.createConnection({
	      host     : '172.17.0.2',
	      user     : 'david',
	      password : '12345678',
	      database : 'kphdb'
	    });
	
	    connection.connect();
	
	    db = connection ;
	
	    console.log("Open MySql DB successfully");
	
	    return db;
	} ;


modify routes/db_ado.js to add the post() method for query.
----------------------------------------------------------

	/* Render /db_ado/quotes template, after submit the query */
	router.post('/quotes', function(req, res, next) {
	
	  var msg = "Result : " ;
	
	  db.query('SELECT * from kphdb.restaurants where trim(borough) = "Brooklyn"', function(err, results, fields) {
	         if (err) throw err;
	         //console.log(results);
	         res.render('ado_table', { items: results} );
	  });
	});
	
	module.exports = router;
	module.exports.db_conn = db_conn ;

../app.js added
---------------

	    do = require('./routes/db_ado'); // dhsia added
	
	    // open DB connection - dhsia
	
	    db_ado.db_conn();   ---> call db_ado.db_conn(), then the db_conn is init
	
	    module.exports = app;

add view/ado_table.jade, use this template to show the query result
------------------------------------------------------------------

	david@ubuntu-pc:~/myexpress/myapp$ cat views/ado_table.jade
	extends layout
	
	block content
	  h1= title
	
	  For query:
	
	  table(border='1')
	    thead
	        tr
	            th #
	            th id
	            th address
	            th borough
	            th cuisine
	            th grades
	            th name
	            th restaurant_id
	    tbody
	        each item, i in items
	            tr
	                td= i+1
	                td= item.id ---> watch! not MongoDB's _id
	                td= item.address
	                td= item.borough
	                td= item.cuisine
	                td= item.grades
	                td= item.name
	                td= item.restaurant_id


OK, start the Express server. You can
------------------------------------

	1. npm start
	or
	2. cd myapp
	   ./bin/www
	
	    You should see the msg "Open Mongo DB successfully"
	3. Open your browser and ope
	
	     http://localhost:3000/  ----> this is index.js 
	
	     http://localhost:3000/db_ado  ----> this isdb_ado.js
		- it displays the query input ---> just enter anything, this is a demo only
		- after you 'submit' ---> it display the query result. The query is hard-coded 
		using  db.query('SELECT * from kphdb.restaurants where trim(borough) = "Brooklyn"', function(err, results, fields) {
		- it should display data in HTML tble nicely... 
	
	4. make sure you load the data first using primer-dataset_short.json
	
