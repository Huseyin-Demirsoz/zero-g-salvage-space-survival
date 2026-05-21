#include "httplib.h"

int main(){
	httplib::Server svr;
	svr.set_mount_point("/","./");
	svr.set_logger([](const httplib::Request &req, const httplib::Response &res) {
		printf("Path: %s | Status: %d\n", req.path.c_str(), res.status);
	});
	std::cout << "ok\n"; //test için print
	svr.listen("localhost", 8080);	
	return 0;
}

